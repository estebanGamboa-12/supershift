declare module "mysql2/promise" {
  export interface RowDataPacket {
    [column: string]: unknown
  }

  export interface ResultSetHeader {
    affectedRows: number
  }

  export interface PoolConnection {
    beginTransaction(): Promise<void>
    commit(): Promise<void>
    rollback(): Promise<void>
    release(): void
    query<T = RowDataPacket[]>(sql: string, values?: unknown[]): Promise<[T, unknown]>
    execute<T = ResultSetHeader>(sql: string, values?: unknown[]): Promise<[T, unknown]>
  }

  export interface Pool {
    query<T = RowDataPacket[]>(sql: string, values?: unknown[]): Promise<[T, unknown]>
    execute<T = ResultSetHeader>(sql: string, values?: unknown[]): Promise<[T, unknown]>
    getConnection(): Promise<PoolConnection>
  }

  export function createPool(config: Record<string, unknown>): Pool
}
