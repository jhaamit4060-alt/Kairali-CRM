import { NextRequest, NextResponse } from 'next/server'
import { createSessionCookieValue } from '@/lib/session'

// Same GAS endpoint hooks/use-auth.tsx used to call directly from the browser.
// Moved server-side so credentials never sit in a client-visible URL, and so this
// route is the one place that verifies identity before minting a session cookie.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzDC3m9yUuTeCska7osn17tIxixwtEt-sN_7tFLi9f8Yb34l9qEcxPg1dCF5KCwvH-i/exec'

export async function POST(req: NextRequest) {
  try {
    const { email, password, company } = await req.json()

    if (!email || !password || !company) {
      return NextResponse.json({ success: false, message: 'Missing email, password, or company' }, { status: 400 })
    }

    const url = new URL(SCRIPT_URL)
    url.searchParams.append('action', 'login')
    url.searchParams.append('email', email)
    url.searchParams.append('password', password)
    url.searchParams.append('company', company)

    const gasResponse = await fetch(url.toString())
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
