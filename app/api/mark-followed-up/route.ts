import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const pool = await getPool()
    const connection = await pool.getConnection()
    
    try {
      const body = await req.json()
      const { leadId, markedBy = 'AI Closing Assistant', notes = 'AI Message Generated & Copied' } = body

      if (!leadId) {
        return NextResponse.json(
          { success: false, error: 'Missing required field: leadId' },
          { status: 400 }
        )
      }

      const followedUpAt = new Date()

      // Insert follow-up log into deal_assistant_followups
      await connection.execute(`
        INSERT INTO deal_assistant_followups (lead_id, followed_up_at, marked_by, notes)
        VALUES (?, ?, ?, ?)
      `, [leadId, followedUpAt, markedBy, notes])

      return NextResponse.json({
        success: true,
        message: 'Lead marked as followed up successfully!',
        followedUpAt: followedUpAt.toISOString()
      })

    } finally {
      connection.release()
    }
  } catch {
    console.error('[mark-followed-up] failed to record follow-up')
    return NextResponse.json(
      { success: false, error: 'Failed to mark lead as followed up' },
      { status: 500 }
    )
  }
}
