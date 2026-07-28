import { NextResponse } from 'next/server'

// HttpOnly cookies can't be cleared by client JS, so logout needs a server round-trip.
export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('kairali_user', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
