import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookieValue } from '@/lib/session'
import type { SessionUser } from '@/lib/ktahv-permissions'

export function getSessionUser(req: NextRequest): SessionUser | null {
  const raw = req.cookies.get('kairali_user')?.value
  if (!raw) return null
  const user = verifySessionCookieValue(raw)
  if (!user || typeof user !== 'object') return null
  return user as SessionUser
}

export function unauthenticatedResponse() {
  return NextResponse.json(
    { success: false, error: 'Authentication required' },
    { status: 401 },
  )
}

export function forbiddenResponse() {
  return NextResponse.json(
    { success: false, error: 'You do not have permission to perform this action' },
    { status: 403 },
  )
}

export function hasTrustedRequestOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return process.env.NODE_ENV !== 'production'
  return origin === req.nextUrl.origin
}
