/**
 * SQL Connector Types
 * Shared type definitions for database connectors.
 */

export type SqlConnectorType = "mssql";
export type SqlAuthType = "sql_auth" | "windows_auth";

export interface SqlConnectorConfig {
  id: string;
  name: string;
  type: SqlConnectorType;
  host: string;
  port: number;
  database: string;
  defaultSchema?: string;
  authType: SqlAuthType;
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

export interface SqlConnectionStatus {
  connectorId: string;
  connected: boolean;
  latencyMs?: number;
  serverVersion?: string;
  error?: string;
  lastChecked: string;
}

export interface SqlColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  maxLength?: number;
  defaultValue?: string;
}

export interface SqlTableInfo {
  schema: string;
  name: string;
  type: "table" | "view";
  rowCount?: number;
}

export interface SqlProcedureInfo {
  schema: string;
  name: string;
  parameters: Array<{
    name: string;
    dataType: string;
    direction: "in" | "out" | "inout";
    defaultValue?: string;
  }>;
}

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionMs: number;
  truncated?: boolean;
  totalRowsBeforeTruncation?: number;
  columnCount?: number;
}

export interface SavedQuery {
  id: string;
  name: string;
  description: string;
  connectorId: string;
  sqlText?: string;
  procedureName?: string;
  parameters?: Array<{ name: string; type: string; defaultValue?: string }>;
  filters?: Array<{
    key: string;
    binding: "body" | "query_param";
    column?: string;
  }>;
  maxRows?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IDatabaseConnector {
  testConnection(): Promise<SqlConnectionStatus>;
  execute(
    sql: string,
    params?: Record<string, unknown>,
    maxRows?: number,
  ): Promise<SqlQueryResult>;
  getSchemas(): Promise<string[]>;
  getTables(schema: string): Promise<SqlTableInfo[]>;
  getColumns(schema: string, table: string): Promise<SqlColumnInfo[]>;
  getProcedures(schema: string): Promise<SqlProcedureInfo[]>;
  close(): Promise<void>;
}
