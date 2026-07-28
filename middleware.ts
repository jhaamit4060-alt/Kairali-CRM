import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookieValue } from '@/lib/session'

// Routes that don't need authentication
const publicRoutes = ['/', '/access-denied']

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/leads',
  '/calls',
  '/reports',
  '/performance',
  '/users',
  '/helpdesk',
  '/fms',
  '/doctor-consultation',
  '/marketing-dashboard',
  '/marketing-funnel',
  '/marketing',
  '/google-adword-reports',
  '/sales',
  '/voicecall',
  '/meetings',
  '/partners',
  '/accounts-tracker',
  '/sales-calling',
  '/new-order-fms',
]

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // Check if user is authenticated (stored in a cookie or header)
    const user = request.cookies.get('kairali_user')?.value

    // If no user, redirect to login
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Verify the signed session — rejects missing, tampered, forged, or expired cookies
    const userData = verifySessionCookieValue(user)
    if (!userData) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  // Node.js runtime, not Edge — verifySessionCookieValue uses Node's `crypto`
  // module (createHmac/timingSafeEqual), which the Edge runtime doesn't support.
  runtime: 'nodejs',
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
