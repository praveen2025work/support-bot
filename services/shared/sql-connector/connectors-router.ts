import { Router, type Request, type Response } from "express";

interface SqlConnectorConfig {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  defaultSchema?: string;
  authType: string;
  username?: string;
  encryptedPassword?: string;
  options?: Record<string, unknown>;
  maxPoolSize?: number;
  connectionTimeout?: number;
  requestTimeout?: number;
  maxRows?: number;
  allowedSchemas?: string[];
  readOnly?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionMs: number;
  truncated?: boolean;
  totalRowsBeforeTruncation?: number;
  columnCount?: number;
}

interface DatabaseConnector {
  getSchemas(): Promise<string[]>;
  getTables(schema: string): Promise<unknown[]>;
  getColumns(schema: string, table: string): Promise<unknown[]>;
  getProcedures(schema: string): Promise<unknown[]>;
  execute(
    sql: string,
    params?: Record<string, unknown>,
    maxRows?: number,
  ): Promise<QueryResult>;
}

interface ConnectionManager {
  listConnectors(): Promise<SqlConnectorConfig[]>;
  getConfig(connectorId: string): Promise<SqlConnectorConfig | undefined>;
  setConfig(config: SqlConnectorConfig): Promise<void>;
  removeConfig(connectorId: string): Promise<void>;
  getConnector(connectorId: string): Promise<DatabaseConnector>;
  testConnection(connectorId: string): Promise<unknown>;
}

interface Logger {
  info(data: unknown, message?: string): void;
  error(data: unknown, message?: string): void;
}

interface ReadOnlyValidation {
  valid: boolean;
  reason?: string;
}

interface CreateSqlConnectorRouterOptions {
  connectionManager: ConnectionManager;
  storePassword(connectorId: string, password: string): Promise<unknown>;
  removePassword(connectorId: string): Promise<void>;
  validateReadOnly(sql: string): ReadOnlyValidation;
  logger: Logger;
  connectorType: string;
  defaultPort: number;
  defaultSchema: string;
}

function stripSecret(config: SqlConnectorConfig) {
  const { encryptedPassword: _encryptedPassword, ...safe } = config;
  return safe;
}

export function createSqlConnectorRouter({
  connectionManager,
  storePassword,
  removePassword,
  validateReadOnly,
  logger,
  connectorType,
  defaultPort,
  defaultSchema,
}: CreateSqlConnectorRouterOptions) {
  const router = Router();

  router.get("/", async (_req: Request, res: Response) => {
    try {
      const connectors = await connectionManager.listConnectors();
      return res.json({ connectors });
    } catch (error) {
      logger.error({ error }, "Failed to list connectors");
      return res.status(500).json({ error: "Failed to list connectors" });
    }
  });

  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const config = await connectionManager.getConfig(req.params.id);
      if (!config) {
        return res.status(404).json({ error: "Connector not found" });
      }
      return res.json(stripSecret(config));
    } catch (error) {
      logger.error({ error }, "Failed to get connector");
      return res.status(500).json({ error: "Failed to get connector" });
    }
  });

  router.post("/", async (req: Request, res: Response) => {
    try {
      const {
        id,
        name,
        host,
        port,
        database,
        defaultSchema: requestedDefaultSchema,
        authType,
        username,
        password,
        options,
        maxPoolSize,
        connectionTimeout,
        requestTimeout,
        maxRows,
        allowedSchemas,
        readOnly,
      } = req.body;

      if (!id || !name || !host || !port || !database) {
        return res
          .status(400)
          .json({ error: "id, name, host, port, and database are required" });
      }

      const existing = await connectionManager.getConfig(id);
      if (existing) {
        return res
          .status(409)
          .json({ error: `Connector "${id}" already exists` });
      }

      const now = new Date().toISOString();
      const config: SqlConnectorConfig = {
        id,
        name,
        type: connectorType,
        host,
        port: Number(port) || defaultPort,
        database,
        defaultSchema: requestedDefaultSchema || undefined,
        authType: authType || "sql_auth",
        username: username || undefined,
        options: options || undefined,
        maxPoolSize: maxPoolSize || 10,
        connectionTimeout: connectionTimeout || 30000,
        requestTimeout: requestTimeout || 60000,
        maxRows: maxRows || 10000,
        allowedSchemas: allowedSchemas || [],
        readOnly: readOnly !== false,
        createdAt: now,
        updatedAt: now,
      };

      if (password) {
        await storePassword(id, password);
      }

      await connectionManager.setConfig(config);

      logger.info(
        { connectorId: id, name, host, database },
        "Connector created",
      );
      return res.status(201).json(stripSecret(config));
    } catch (error) {
      logger.error({ error }, "Failed to create connector");
      return res.status(500).json({ error: "Failed to create connector" });
    }
  });

  router.put("/:id", async (req: Request, res: Response) => {
    try {
      const connectorId = req.params.id;
      const existing = await connectionManager.getConfig(connectorId);
      if (!existing) {
        return res.status(404).json({ error: "Connector not found" });
      }

      const { password, ...updates } = req.body;
      const updated: SqlConnectorConfig = {
        ...existing,
        ...updates,
        id: connectorId,
        type: connectorType,
        updatedAt: new Date().toISOString(),
      };

      if (password) {
        await storePassword(connectorId, password);
      }

      await connectionManager.setConfig(updated);

      logger.info(
        { connectorId, updatedFields: Object.keys(updates) },
        "Connector updated",
      );
      return res.json(stripSecret(updated));
    } catch (error) {
      logger.error({ error }, "Failed to update connector");
      return res.status(500).json({ error: "Failed to update connector" });
    }
  });

  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      const connectorId = req.params.id;
      const existing = await connectionManager.getConfig(connectorId);
      if (!existing) {
        return res.status(404).json({ error: "Connector not found" });
      }

      await connectionManager.removeConfig(connectorId);
      await removePassword(connectorId);

      logger.info({ connectorId }, "Connector deleted");
      return res.json({ success: true, deletedConnectorId: connectorId });
    } catch (error) {
      logger.error({ error }, "Failed to delete connector");
      return res.status(500).json({ error: "Failed to delete connector" });
    }
  });

  router.post("/:id/test", async (req: Request, res: Response) => {
    try {
      const status = await connectionManager.testConnection(req.params.id);
      return res.json(status);
    } catch (error) {
      logger.error({ error }, "Failed to test connection");
      return res.status(500).json({ error: "Failed to test connection" });
    }
  });

  router.get("/:id/schemas", async (req: Request, res: Response) => {
    try {
      const connector = await connectionManager.getConnector(req.params.id);
      const schemas = await connector.getSchemas();
      return res.json({ schemas });
    } catch (error) {
      logger.error({ error }, "Failed to get schemas");
      return res.status(500).json({ error: "Failed to get schemas" });
    }
  });

  router.get("/:id/tables", async (req: Request, res: Response) => {
    try {
      const schema = (req.query.schema as string) || defaultSchema;
      const connector = await connectionManager.getConnector(req.params.id);
      const tables = await connector.getTables(schema);
      return res.json({ tables });
    } catch (error) {
      logger.error({ error }, "Failed to get tables");
      return res.status(500).json({ error: "Failed to get tables" });
    }
  });

  router.get("/:id/columns", async (req: Request, res: Response) => {
    try {
      const schema = (req.query.schema as string) || defaultSchema;
      const table = req.query.table as string;
      if (!table) {
        return res
          .status(400)
          .json({ error: "table query parameter is required" });
      }

      const connector = await connectionManager.getConnector(req.params.id);
      const columns = await connector.getColumns(schema, table);
      return res.json({ columns });
    } catch (error) {
      logger.error({ error }, "Failed to get columns");
      return res.status(500).json({ error: "Failed to get columns" });
    }
  });

  router.get("/:id/procedures", async (req: Request, res: Response) => {
    try {
      const schema = (req.query.schema as string) || defaultSchema;
      const connector = await connectionManager.getConnector(req.params.id);
      const procedures = await connector.getProcedures(schema);
      return res.json({ procedures });
    } catch (error) {
      logger.error({ error }, "Failed to get procedures");
      return res.status(500).json({ error: "Failed to get procedures" });
    }
  });

  router.post("/:id/preview", async (req: Request, res: Response) => {
    try {
      const { sql, params, maxRows } = req.body;
      if (!sql) return res.status(400).json({ error: "sql is required" });

      const validation = validateReadOnly(sql);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.reason });
      }

      const connector = await connectionManager.getConnector(req.params.id);
      const result = await connector.execute(sql, params || {}, maxRows || 100);
      return res.json(result);
    } catch (error) {
      logger.error({ error }, "Failed to execute preview query");
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to execute query",
      });
    }
  });

  return router;
}
