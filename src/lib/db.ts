import { createPool, type Pool } from "mysql2/promise"

let pool: Pool | null = null

export function getPool() {
  if (!pool) {
    const host = process.env.DATABASE_HOST ?? process.env.DB_HOST ?? "127.0.0.1"
    const port = Number(process.env.DATABASE_PORT ?? process.env.DB_PORT ?? 3306)
    const user = process.env.DATABASE_USER ?? process.env.DB_USER ?? "root"
    const password = process.env.DATABASE_PASSWORD ?? process.env.DB_PASSWORD ?? ""
    const database = process.env.DATABASE_NAME ?? process.env.DB_NAME ?? "supershift"

    pool = createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 5,
      idleTimeout: 60000,
    })
  }

  return pool
}
