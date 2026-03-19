/**
 * MS SQL Server Connector
 * Wraps the `mssql` package for connection pooling, query execution, and schema introspection.
 */

import { logger } from "@/lib/logger";
import type {
  IDatabaseConnector,
  SqlConnectorConfig,
  SqlConnectionStatus,
  SqlQueryResult,
  SqlTableInfo,
  SqlColumnInfo,
  SqlProcedureInfo,
} from "./types";
import { validateReadOnly, enforceRowLimit } from "./query-executor";

// Lazy-load mssql to avoid crashing if not installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mssql: any = null;
async function getMssql() {
  if (!mssql) {
    try {
      const mod = await import("mssql");
      // Dynamic import wraps CJS modules — ConnectionPool lives under .default
      mssql = mod.default || mod;
    } catch {
      throw new Error("mssql package is not installed. Run: npm install mssql");
    }
  }
  return mssql;
}

export class MssqlConnector implements IDatabaseConnector {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pool: any = null;
  private config: SqlConnectorConfig;
  private password: string;

  constructor(config: SqlConnectorConfig, password: string) {
    this.config = config;
    this.password = password;
  }

  private async getPool() {
    if (this.pool) return this.pool;
    const sql = await getMssql();

    const poolConfig = {
      server: this.config.host,
      port: this.config.port || 1433,
      database: this.config.database,
      user: this.config.username,
      password: this.password,
      pool: {
        max: this.config.maxPoolSize || 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      options: {
        encrypt: (this.config.options?.encrypt as boolean) ?? true,
        trustServerCertificate:
          (this.config.options?.trustServerCertificate as boolean) ?? true,
        connectTimeout: this.config.connectionTimeout || 30000,
        requestTimeout: this.config.requestTimeout || 60000,
      },
    };

    this.pool = new sql.ConnectionPool(poolConfig);
    await this.pool.connect();
    logger.info(
      { connectorId: this.config.id, host: this.config.host },
      "MSSQL pool connected",
    );
    return this.pool;
  }

  async testConnection(): Promise<SqlConnectionStatus> {
    const start = Date.now();
    try {
      const pool = await this.getPool();
      const result = await pool.request().query("SELECT @@VERSION AS version");
      return {
        connectorId: this.config.id,
        connected: true,
        latencyMs: Date.now() - start,
        serverVersion: String(result.recordset?.[0]?.version ?? "").split(
          "\n",
        )[0],
        lastChecked: new Date().toISOString(),
      };
    } catch (err) {
      return {
        connectorId: this.config.id,
        connected: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
        lastChecked: new Date().toISOString(),
      };
    }
  }

  async execute(
    sqlText: string,
    params?: Record<string, unknown>,
    maxRows?: number,
  ): Promise<SqlQueryResult> {
    // Read-only enforcement
    if (this.config.readOnly !== false) {
      const validation = validateReadOnly(sqlText);
      if (!validation.valid) {
        throw new Error(validation.reason);
      }
    }

    const pool = await this.getPool();
    const request = pool.request();

    // Bind parameters safely
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
      }
    }

    const start = Date.now();
    const result = await request.query(sqlText);
    const executionMs = Date.now() - start;

    const rawRows = result.recordset || [];
    const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
    const limit = maxRows ?? this.config.maxRows ?? 10000;
    const { rows, truncated, totalRowsBeforeTruncation } = enforceRowLimit(
      rawRows,
      limit,
    );

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionMs,
      truncated,
      totalRowsBeforeTruncation,
      columnCount: columns.length,
    };
  }

  async getSchemas(): Promise<string[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA
       WHERE SCHEMA_NAME NOT IN ('sys', 'INFORMATION_SCHEMA', 'guest')
       ORDER BY SCHEMA_NAME`,
    );
    return result.recordset.map((r: Record<string, unknown>) =>
      String(r.SCHEMA_NAME),
    );
  }

  async getTables(schema: string): Promise<SqlTableInfo[]> {
    const pool = await this.getPool();
    const result = await pool
      .request()
      .input("schema", schema)
      .query(
        `SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = @schema
         ORDER BY TABLE_TYPE, TABLE_NAME`,
      );
    return result.recordset.map((r: Record<string, unknown>) => ({
      schema: String(r.TABLE_SCHEMA),
      name: String(r.TABLE_NAME),
      type:
        String(r.TABLE_TYPE) === "VIEW"
          ? ("view" as const)
          : ("table" as const),
    }));
  }

  async getColumns(schema: string, table: string): Promise<SqlColumnInfo[]> {
    const pool = await this.getPool();
    const result = await pool
      .request()
      .input("schema", schema)
      .input("table", table)
      .query(
        `SELECT
           c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE, c.CHARACTER_MAXIMUM_LENGTH, c.COLUMN_DEFAULT,
           CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS IS_PK
         FROM INFORMATION_SCHEMA.COLUMNS c
         LEFT JOIN (
           SELECT ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
           FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
           JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
           WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
         ) pk ON c.TABLE_SCHEMA = pk.TABLE_SCHEMA AND c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
         WHERE c.TABLE_SCHEMA = @schema AND c.TABLE_NAME = @table
         ORDER BY c.ORDINAL_POSITION`,
      );
    return result.recordset.map((r: Record<string, unknown>) => ({
      name: String(r.COLUMN_NAME),
      dataType: String(r.DATA_TYPE),
      nullable: String(r.IS_NULLABLE) === "YES",
      isPrimaryKey: r.IS_PK === 1,
      maxLength:
        r.CHARACTER_MAXIMUM_LENGTH != null
          ? Number(r.CHARACTER_MAXIMUM_LENGTH)
          : undefined,
      defaultValue:
        r.COLUMN_DEFAULT != null ? String(r.COLUMN_DEFAULT) : undefined,
    }));
  }

  async getProcedures(schema: string): Promise<SqlProcedureInfo[]> {
    const pool = await this.getPool();
    const procsResult = await pool
      .request()
      .input("schema", schema)
      .query(
        `SELECT SPECIFIC_SCHEMA, SPECIFIC_NAME
         FROM INFORMATION_SCHEMA.ROUTINES
         WHERE ROUTINE_SCHEMA = @schema AND ROUTINE_TYPE = 'PROCEDURE'
         ORDER BY SPECIFIC_NAME`,
      );

    const procedures: SqlProcedureInfo[] = [];
    for (const proc of procsResult.recordset) {
      const paramsResult = await pool
        .request()
        .input("schema", String(proc.SPECIFIC_SCHEMA))
        .input("name", String(proc.SPECIFIC_NAME))
        .query(
          `SELECT PARAMETER_NAME, DATA_TYPE, PARAMETER_MODE
           FROM INFORMATION_SCHEMA.PARAMETERS
           WHERE SPECIFIC_SCHEMA = @schema AND SPECIFIC_NAME = @name
           ORDER BY ORDINAL_POSITION`,
        );
      procedures.push({
        schema: String(proc.SPECIFIC_SCHEMA),
        name: String(proc.SPECIFIC_NAME),
        parameters: paramsResult.recordset.map(
          (p: Record<string, unknown>) => ({
            name: String(p.PARAMETER_NAME).replace(/^@/, ""),
            dataType: String(p.DATA_TYPE),
            direction:
              String(p.PARAMETER_MODE) === "INOUT"
                ? ("inout" as const)
                : String(p.PARAMETER_MODE) === "OUT"
                  ? ("out" as const)
                  : ("in" as const),
          }),
        ),
      });
    }
    return procedures;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      logger.info({ connectorId: this.config.id }, "MSSQL pool closed");
    }
  }
}
