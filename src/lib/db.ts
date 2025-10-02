import type { Pool, PoolOptions, RowDataPacket } from "mysql2/promise"

let pool: Pool | null = null

function getPoolOptions(): PoolOptions {
  const port = Number.parseInt(process.env.DB_PORT ?? "3306", 10)

  return {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number.isNaN(port) ? 3306 : port,
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "supershift",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
  }
}

export async function getPool(): Promise<Pool> {
  if (!pool) {
    const mysql = await import("mysql2/promise")
    pool = mysql.createPool(getPoolOptions())

    pool.on("error", (error) => {
      console.error("MySQL pool error", error)
    })
  }

  return pool
}

export async function queryRows<T extends RowDataPacket[]>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const poolConnection = await getPool()
  const [rows] = await poolConnection.query<T>(sql, params)
  return rows
}
