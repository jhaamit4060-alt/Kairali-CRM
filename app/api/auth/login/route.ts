import { NextRequest, NextResponse } from 'next/server'
import { createSessionCookieValue } from '@/lib/session'
import { hasTrustedRequestOrigin } from '@/lib/server-session'

const UPSTREAM_TIMEOUT_MS = 15_000

function getAuthIntegrationConfig() {
  const rawUrl = process.env.KTAHV_AUTH_SCRIPT_URL?.trim()
  const token = process.env.KTAHV_AUTH_SCRIPT_TOKEN?.trim()
  if (!rawUrl || !token) throw new Error('Authentication integration is not configured')
  const url = new URL(rawUrl)
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com') {
    throw new Error('KTAHV_AUTH_SCRIPT_URL must be an HTTPS script.google.com URL')
  }
  return { url, token }
}

export async function POST(req: NextRequest) {
  if (!hasTrustedRequestOrigin(req)) {
    return NextResponse.json({ success: false, message: 'Untrusted request origin' }, { status: 403 })
  }

  try {
    const { email, password, company } = await req.json()

    if (!email || !password || !company) {
      return NextResponse.json({ success: false, message: 'Missing email, password, or company' }, { status: 400 })
    }
    const normalizedEmail = String(email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ success: false, message: 'Invalid email address' }, { status: 400 })
    }
    if (String(password).length > 256 || !['KAPPL', 'KTAHV'].includes(String(company))) {
      return NextResponse.json({ success: false, message: 'Invalid login request' }, { status: 400 })
    }

    const { url, token } = getAuthIntegrationConfig()
    const gasResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kairali-Integration-Token': token,
      },
      body: JSON.stringify({
        action: 'login',
        email: normalizedEmail,
        password,
        company,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    if (!gasResponse.ok) {
      return NextResponse.json(
        { success: false, message: 'Authentication service unavailable' },
        { status: 502 },
      )
    }
    const data = await gasResponse.json()

    if (!data.success || !data.user) {
      return NextResponse.json(
        { success: false, message: data.message || 'Invalid credentials or inactive account' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ success: true, user: data.user })

    response.cookies.set('kairali_user', createSessionCookieValue(data.user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (err: any) {
    console.error('[Login API Error]', err)
    return NextResponse.json({ success: false, message: 'Login failed' }, { status: 500 })
  }
}
