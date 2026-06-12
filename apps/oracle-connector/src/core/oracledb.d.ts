declare module "oracledb" {
  export const BIND_IN: number;
  export const BIND_OUT: number;
  export const OUT_FORMAT_OBJECT: number;

  export interface ConnectionAttributes {
    user?: string;
    password?: string;
    connectString?: string;
    poolMin?: number;
    poolMax?: number;
    poolTimeout?: number;
    queueTimeout?: number;
    externalAuth?: boolean;
  }

  export interface Pool {
    getConnection(): Promise<Connection>;
    close(drainTime?: number): Promise<void>;
  }

  export interface Connection {
    /**
     * Maximum time (ms) a single round-trip database call may run before
     * oracledb interrupts it. 0 (default) means no timeout. Used to release an
     * abandoned request's connection promptly.
     */
    callTimeout?: number;
    execute<T = Record<string, unknown>>(
      sql: string,
      params?: Record<string, unknown> | unknown[],
      options?: ExecuteOptions,
    ): Promise<Result<T>>;
    close(): Promise<void>;
  }

  export interface ExecuteOptions {
    outFormat?: number;
    maxRows?: number;
    fetchArraySize?: number;
  }

  export interface Result<T = Record<string, unknown>> {
    rows?: T[];
    metaData?: Array<{ name: string }>;
    rowsAffected?: number;
  }

  export function createPool(attrs: ConnectionAttributes): Promise<Pool>;

  const _default: {
    OUT_FORMAT_OBJECT: number;
    BIND_IN: number;
    BIND_OUT: number;
    createPool: typeof createPool;
  };
  export default _default;
}
