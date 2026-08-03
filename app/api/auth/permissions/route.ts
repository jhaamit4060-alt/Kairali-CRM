import { NextResponse } from 'next/server'
import { fetchRolePermissions, type RolePermissionsFailure } from '@/lib/role-permissions'

// Same-origin source for the role/permission table that hooks/use-auth.tsx used
// to fetch straight from the browser. Only the transport moves: the upstream
// request, the returned values, and the client's fallback behaviour are the ones
// that were already in place.
//
// The upstream exchange itself now lives in lib/role-permissions.ts, shared with
// app/api/auth/login/route.ts so a fresh login signs the same table this route
// reports. This route's request shape, status codes, log categories, and
// response body are unchanged by that extraction.
//
// This route answers "what does the permissions sheet say", not "what may the
// caller do". It reads no session and applies no authorization — deliberately,
// because the fetch it replaces was itself unauthenticated and runs on the login
// screen before any session exists. `/api/auth/permissions` is exempted in
// middleware.ts for the same reason.

export const dynamic = 'force-dynamic'

// The permission table is per-deployment, not per-user, but it is still
// authorization data: it must not land in a shared or disk cache, and a stale
// copy must never be replayed after the sheet changes. The client keeps its own
// one-hour localStorage cache, which is unaffected by this header.
const NO_STORE = 'private, no-store'

// Fixed reply for every failure mode. A timeout, a transport error, a non-JSON
// Apps Script error page, and an unrecognised payload are indistinguishable to
// the caller: it learns only that the permission table is unavailable, which is
// all it needs to fall back.
const MSG_UNAVAILABLE = 'Permissions unavailable'

// Fixed log category and status per failure kind. Nothing from the upstream
// body, URL, or exception is recorded — only which of the five known modes it
// was, exactly as the inline handlers reported before the extraction.
const FAILURES: Record<RolePermissionsFailure, { log: string; status: number }> = {
  configuration: { log: '[permissions] GAS_SHARED_SECRET is not configured', status: 503 },
  'upstream-status': { log: '[permissions] upstream returned a non-success status', status: 502 },
  timeout: { log: '[permissions] upstream request timed out', status: 504 },
  transport: { log: '[permissions] upstream request failed', status: 502 },
  payload: { log: '[permissions] upstream returned an unexpected payload', status: 502 },
}

function jsonNoStore(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': NO_STORE } })
}

export async function GET() {
  const result = await fetchRolePermissions()

  if (!result.ok) {
    const { log, status } = FAILURES[result.reason]
    console.error(log)
    return jsonNoStore({ success: false, error: MSG_UNAVAILABLE }, status)
  }

  // Only the table. Any other field the sheet happens to return is not
  // forwarded, so this route's surface stays exactly what the client consumes.
  return jsonNoStore({ success: true, rolePermissions: result.rolePermissions }, 200)
}
