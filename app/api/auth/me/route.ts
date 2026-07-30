import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, unauthenticatedResponse } from '@/lib/server-session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = getSessionUser(req)
  if (!user) return unauthenticatedResponse()
  return NextResponse.json(
    { success: true, user },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
