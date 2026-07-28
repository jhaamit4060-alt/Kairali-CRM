import mysql from 'mysql2/promise'

const DB_CONFIG = {
  host: '165.22.220.165',
  port: 3306,
  database: 'spalabsdomain_Kairali_CRM_Db',
  user: 'spalabsdomain_developer',
  password: 'Kai#ra$li@123!',
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
