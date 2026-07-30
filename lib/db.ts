import mysql from 'mysql2/promise'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set — check .env.local (dev) or Vercel project env vars (prod).`)
  return value
}

const DB_CONFIG = {
  host: requireEnv('DB_HOST'),
  port: Number(process.env.DB_PORT || 3306),
  database: requireEnv('DB_NAME'),
  user: requireEnv('DB_USER'),
  password: requireEnv('DB_PASSWORD'),
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 30000,
}
declare global {
  var _sqlPool: mysql.Pool | undefined
}

export async function getPool(): Promise<mysql.Pool> {

  if (global._sqlPool) return global._sqlPool

  console.log('[DB] Connecting to:', DB_CONFIG.host, DB_CONFIG.database)

  global._sqlPool = mysql.createPool(DB_CONFIG)

  console.log('[DB] Connected!')

  return global._sqlPool
}

/* -----------------------------------
   Retry wrapper for DB queries
----------------------------------- */

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 200
): Promise<T> {

  let lastError: any

  for (let i = 0; i < retries; i++) {

    try {
      return await fn()
    } catch (err) {

      lastError = err

      if (i < retries - 1) {

        const wait = delay * Math.pow(2, i)

        console.warn(`[DB] Retry ${i + 1}/${retries} after ${wait}ms`)

        await new Promise((resolve) => setTimeout(resolve, wait))
      }
    }
  }

  throw lastError
}

export { mysql as sql }
