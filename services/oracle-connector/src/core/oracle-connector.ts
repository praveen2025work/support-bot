/**
 * Oracle Database Connector
 * Wraps the `oracledb` package for connection pooling, query execution, and schema introspection.
 * Requires Oracle Instant Client to be installed on the host system.
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

// Lazy-load oracledb to avoid crashing if not installed
let oracledb: typeof import("oracledb") | null = null;
async function getOracledb() {
  if (!oracledb) {
    try {
      oracledb = await import("oracledb");
    } catch {
      throw new Error(
        "oracledb package is not installed. Run: npm install oracledb\n" +
          "Note: For full functionality, Oracle Instant Client may be required.",
      );
    }
  }
  return oracledb;
}

export class OracleConnector implements IDatabaseConnector {
  private pool: import("oracledb").Pool | null = null;
  private config: SqlConnectorConfig;
  private password: string;

  constructor(config: SqlConnectorConfig, password: string) {
    this.config = config;
    this.password = password;
  }

  private async getPool() {
    if (this.pool) return this.pool;
    const ora = await getOracledb();

    const connectString = `${this.config.host}:${this.config.port || 1521}/${this.config.database}`;

    this.pool = await ora.default.createPool({
      user: this.config.username,
      password: this.password,
      connectString,
      poolMin: 0,
      poolMax: this.config.maxPoolSize || 10,
      poolTimeout: 60,
    });

    logger.info(
      { connectorId: this.config.id, host: this.config.host },
      "Oracle pool created",
    );
    return this.pool;
  }

  private async withConnection<T>(
    fn: (conn: import("oracledb").Connection) => Promise<T>,
  ): Promise<T> {
    const pool = await this.getPool();
    if (!pool) throw new Error("Oracle connection pool not available");
    const connection = await pool.getConnection();
    try {
      return await fn(connection);
    } finally {
      await connection.close();
    }
  }

  async testConnection(): Promise<SqlConnectionStatus> {
    const start = Date.now();
    try {
      const version = await this.withConnection(async (conn) => {
        const result = await conn.execute<{ BANNER: string }>(
          "SELECT BANNER FROM V$VERSION WHERE ROWNUM = 1",
        );
        return result.rows?.[0]?.BANNER ?? "Unknown";
      });
      return {
        connectorId: this.config.id,
        connected: true,
        latencyMs: Date.now() - start,
        serverVersion: String(version),
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
    if (this.config.readOnly !== false) {
      const validation = validateReadOnly(sqlText);
      if (!validation.valid) {
        throw new Error(validation.reason);
      }
    }

    const ora = await getOracledb();
    const limit = maxRows ?? this.config.maxRows ?? 10000;

    return this.withConnection(async (conn) => {
      const start = Date.now();
      const result = await conn.execute(sqlText, params || {}, {
        outFormat: ora.default.OUT_FORMAT_OBJECT,
        maxRows: limit + 1, // Fetch one extra to detect truncation
      });
      const executionMs = Date.now() - start;

      const rawRows = (result.rows || []) as Record<string, unknown>[];
      const columns =
        result.metaData?.map((m: { name: string }) => m.name) ||
        (rawRows.length > 0 ? Object.keys(rawRows[0]) : []);
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
    });
  }

  async getSchemas(): Promise<string[]> {
    return this.withConnection(async (conn) => {
      const ora = await getOracledb();
      const result = await conn.execute(
        `SELECT USERNAME FROM ALL_USERS
         WHERE USERNAME NOT IN ('SYS', 'SYSTEM', 'DBSNMP', 'OUTLN', 'XDB', 'WMSYS', 'CTXSYS', 'MDSYS', 'ORDSYS', 'ORDDATA')
         ORDER BY USERNAME`,
        {},
        { outFormat: ora.default.OUT_FORMAT_OBJECT },
      );
      return ((result.rows || []) as Record<string, unknown>[]).map((r) =>
        String(r.USERNAME),
      );
    });
  }

  async getTables(schema: string): Promise<SqlTableInfo[]> {
    return this.withConnection(async (conn) => {
      const ora = await getOracledb();
      const result = await conn.execute(
        `SELECT OWNER, OBJECT_NAME, OBJECT_TYPE
         FROM ALL_OBJECTS
         WHERE OWNER = :owner_name AND OBJECT_TYPE IN ('TABLE', 'VIEW')
         ORDER BY OBJECT_TYPE, OBJECT_NAME`,
        { owner_name: schema.toUpperCase() },
        { outFormat: ora.default.OUT_FORMAT_OBJECT },
      );
      return ((result.rows || []) as Record<string, unknown>[]).map((r) => ({
        schema: String(r.OWNER),
        name: String(r.OBJECT_NAME),
        type:
          String(r.OBJECT_TYPE) === "VIEW"
            ? ("view" as const)
            : ("table" as const),
      }));
    });
  }

  async getColumns(schema: string, table: string): Promise<SqlColumnInfo[]> {
    return this.withConnection(async (conn) => {
      const ora = await getOracledb();
      const result = await conn.execute(
        `SELECT
           c.COLUMN_NAME, c.DATA_TYPE, c.NULLABLE, c.DATA_LENGTH, c.DATA_DEFAULT,
           CASE WHEN cc.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS IS_PK
         FROM ALL_TAB_COLUMNS c
         LEFT JOIN (
           SELECT acc.OWNER, acc.TABLE_NAME, acc.COLUMN_NAME
           FROM ALL_CONS_COLUMNS acc
           JOIN ALL_CONSTRAINTS ac ON acc.CONSTRAINT_NAME = ac.CONSTRAINT_NAME AND acc.OWNER = ac.OWNER
           WHERE ac.CONSTRAINT_TYPE = 'P'
         ) cc ON c.OWNER = cc.OWNER AND c.TABLE_NAME = cc.TABLE_NAME AND c.COLUMN_NAME = cc.COLUMN_NAME
         WHERE c.OWNER = :owner_name AND c.TABLE_NAME = :table_name
         ORDER BY c.COLUMN_ID`,
        { owner_name: schema.toUpperCase(), table_name: table.toUpperCase() },
        { outFormat: ora.default.OUT_FORMAT_OBJECT },
      );
      return ((result.rows || []) as Record<string, unknown>[]).map((r) => ({
        name: String(r.COLUMN_NAME),
        dataType: String(r.DATA_TYPE),
        nullable: String(r.NULLABLE) === "Y",
        isPrimaryKey: r.IS_PK === 1,
        maxLength: r.DATA_LENGTH != null ? Number(r.DATA_LENGTH) : undefined,
        defaultValue:
          r.DATA_DEFAULT != null ? String(r.DATA_DEFAULT).trim() : undefined,
      }));
    });
  }

  async getProcedures(schema: string): Promise<SqlProcedureInfo[]> {
    return this.withConnection(async (conn) => {
      const ora = await getOracledb();
      const procsResult = await conn.execute(
        `SELECT OWNER, OBJECT_NAME FROM ALL_PROCEDURES
         WHERE OWNER = :owner_name AND OBJECT_TYPE = 'PROCEDURE'
         ORDER BY OBJECT_NAME`,
        { owner_name: schema.toUpperCase() },
        { outFormat: ora.default.OUT_FORMAT_OBJECT },
      );

      const procedures: SqlProcedureInfo[] = [];
      for (const proc of (procsResult.rows || []) as Record<
        string,
        unknown
      >[]) {
        const paramsResult = await conn.execute(
          `SELECT ARGUMENT_NAME, DATA_TYPE, IN_OUT
           FROM ALL_ARGUMENTS
           WHERE OWNER = :owner_name AND OBJECT_NAME = :proc_name AND ARGUMENT_NAME IS NOT NULL
           ORDER BY POSITION`,
          {
            owner_name: String(proc.OWNER),
            proc_name: String(proc.OBJECT_NAME),
          },
          { outFormat: ora.default.OUT_FORMAT_OBJECT },
        );
        procedures.push({
          schema: String(proc.OWNER),
          name: String(proc.OBJECT_NAME),
          parameters: (
            (paramsResult.rows || []) as Record<string, unknown>[]
          ).map((p) => ({
            name: String(p.ARGUMENT_NAME),
            dataType: String(p.DATA_TYPE),
            direction:
              String(p.IN_OUT) === "IN/OUT"
                ? ("inout" as const)
                : String(p.IN_OUT) === "OUT"
                  ? ("out" as const)
                  : ("in" as const),
          })),
        });
      }
      return procedures;
    });
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close(0);
      this.pool = null;
      logger.info({ connectorId: this.config.id }, "Oracle pool closed");
    }
  }
}
