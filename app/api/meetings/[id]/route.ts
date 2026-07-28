// src/app/api/meetings/[id]/route.ts
// Phase 2: ownership-checked. A user can only open/delete their OWN meeting
// unless they are super_admin / admin.

import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { deleteAudioFromDrive } from '@/lib/google-drive'

const ADMIN_ROLES = ['super_admin', 'admin']

// Can this caller access this meeting?
function canAccess(meeting: any, email: string, role: string): boolean {
  if (ADMIN_ROLES.includes(role)) return true
  return meeting.recorded_by === email
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }    = await params
    const meetingId = parseInt(id)
    const pool = await getPool()
    if (isNaN(meetingId)) {
      return NextResponse.json({ error: 'Invalid meeting ID' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email') || ''
    const role  = searchParams.get('role')  || ''

    const [[meeting]]: any = await pool.execute(
      'SELECT * FROM meetings WHERE id = ?',
      [meetingId]
    )

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // ── Ownership check ─────────────────────────────────────────────────────
    if (!canAccess(meeting, email, role)) {
      return NextResponse.json(
        { error: 'You do not have access to this meeting.' },
        { status: 403 }
      )
    }

    const parsed = {
      ...meeting,
      action_items:  meeting.action_items  ? JSON.parse(meeting.action_items)  : [],
      key_decisions: meeting.key_decisions ? JSON.parse(meeting.key_decisions) : [],
      participants:  meeting.participants  ? JSON.parse(meeting.participants)  : [],
      follow_ups:    meeting.follow_ups    ? JSON.parse(meeting.follow_ups)    : [],
    }

    const [tasks]: any = await pool.execute(
      `SELECT * FROM meeting_tasks WHERE meeting_id = ?
       ORDER BY FIELD(priority,'high','medium','low'), deadline ASC`,
      [meetingId]
    )

    return NextResponse.json({ meeting: parsed, tasks })

  } catch (err: any) {
    console.error('[GET /api/meetings/[id]]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }    = await params
    const meetingId = parseInt(id)
    const pool = await getPool()
    if (isNaN(meetingId)) {
      return NextResponse.json({ error: 'Invalid meeting ID' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email') || ''
    const role  = searchParams.get('role')  || ''

    const [[meeting]]: any = await pool.execute(
      'SELECT id, audio_url, recorded_by FROM meetings WHERE id = ?',
      [meetingId]
    )

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // ── Ownership check — only owner or admin can delete ────────────────────
    if (!canAccess(meeting, email, role)) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this meeting.' },
        { status: 403 }
      )
    }

    if (meeting.audio_url) {
      await deleteAudioFromDrive(meeting.audio_url)
    }

    await pool.execute('DELETE FROM meetings WHERE id = ?', [meetingId])
    return NextResponse.json({ success: true, deleted_id: meetingId })

  } catch (err: any) {
    console.error('[DELETE /api/meetings/[id]]', err)
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 })
  }
}
