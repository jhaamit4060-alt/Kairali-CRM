import mysql from 'mysql2/promise'

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function positiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return value
}

function getDbConfig(): mysql.PoolOptions {
  return {
    host: requiredEnv('DB_HOST'),
    port: positiveIntegerEnv('DB_PORT', 3306),
    database: requiredEnv('DB_NAME'),
    user: requiredEnv('DB_USER'),
    password: requiredEnv('DB_PASSWORD'),
    waitForConnections: true,
    connectionLimit: positiveIntegerEnv('DB_CONNECTION_LIMIT', 10),
    queueLimit: positiveIntegerEnv('DB_QUEUE_LIMIT', 50),
    connectTimeout: positiveIntegerEnv('DB_CONNECT_TIMEOUT_MS', 30000),
    enableKeepAlive: true,
  }
}

declare global {
  var _sqlPool: mysql.Pool | undefined
}

export async function getPool(): Promise<mysql.Pool> {
  if (global._sqlPool) return global._sqlPool

  global._sqlPool = mysql.createPool(getDbConfig())

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
