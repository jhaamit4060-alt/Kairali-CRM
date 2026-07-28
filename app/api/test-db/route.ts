import { getPool } from '@/lib/db'

export async function GET() {
  try {
    const pool = await getPool()
    const [rows] = await pool.query('SELECT 1 as connected')
    return Response.json({ success: true, result: rows })
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}





