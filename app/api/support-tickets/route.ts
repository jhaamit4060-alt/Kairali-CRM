import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

function generateTicketId() {
    const n = Math.floor(1000 + Math.random() * 9000)
    return `TCK-${n}`
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { referenceId, category, description, source, userId, userName } = body

        if (!description || !description.trim()) {
            return NextResponse.json({ error: 'Description is required' }, { status: 400 })
        }

        const ticketId = generateTicketId()
        const pool = await getPool()

        await pool.query(
            `INSERT INTO support_tickets
        (ticket_id, reference_id, user_id, user_name, category, description, source, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', NOW())`,
            [ticketId, referenceId || null, userId || null, userName || null, category, description, source]
        )

        return NextResponse.json({ ticketId, status: 'open' })
    } catch {
        console.error('[support-tickets] ticket creation failed')
        return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
    }
}
