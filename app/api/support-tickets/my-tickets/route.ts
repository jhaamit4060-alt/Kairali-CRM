import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        const pool = await getPool()
        const [rows] = await pool.query(
            `SELECT ticket_id as ticketId, reference_id as referenceId, category, description, status, created_at as createdAt 
             FROM support_tickets 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [userId]
        )

        return NextResponse.json({ tickets: rows })
    } catch (err: any) {
        console.error('[my-tickets] error:', err)
        return NextResponse.json({ error: 'Failed to fetch tickets', detail: err.message }, { status: 500 })
    }
}
