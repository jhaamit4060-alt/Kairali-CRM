import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getKtahvBookingAccessRecord } from '@/lib/ktahv-bookings-server'
import {
  canPerformKtahvMutation,
  isKtahvMutationAction,
} from '@/lib/ktahv-permissions'
import {
  forbiddenResponse,
  getSessionUser,
  hasTrustedRequestOrigin,
  unauthenticatedResponse,
} from '@/lib/server-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_BODY_BYTES = 8 * 1024 * 1024
const UPSTREAM_TIMEOUT_MS = 30_000

function getRequiredIntegrationConfig() {
  const rawUrl = process.env.KTAHV_BOOKINGS_SCRIPT_URL?.trim()
  const token = process.env.KTAHV_BOOKINGS_SCRIPT_TOKEN?.trim()
  if (!rawUrl || !token) {
    throw new Error('KTAHV booking integration is not configured')
  }

  const url = new URL(rawUrl)
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com') {
    throw new Error('KTAHV_BOOKINGS_SCRIPT_URL must be an HTTPS script.google.com URL')
  }
  return { url, token }
}

function extractBookingId(payload: Record<string, unknown>): string {
  const paymentData =
    payload.paymentData && typeof payload.paymentData === 'object'
      ? (payload.paymentData as Record<string, unknown>)
      : null
  const value = payload.bookingId ?? payload.id ?? paymentData?.bookingId
  return String(value ?? '').trim()
}

export async function POST(req: NextRequest) {
  const sessionUser = getSessionUser(req)
  if (!sessionUser) return unauthenticatedResponse()
  if (!hasTrustedRequestOrigin(req)) {
    return NextResponse.json(
      { success: false, error: 'Untrusted request origin' },
      { status: 403 },
    )
  }

  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { success: false, error: 'Request body is too large' },
      { status: 413 },
    )
  }

  try {
    const rawBody = await req.text()
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Request body is too large' },
        { status: 413 },
      )
    }

    const parsed = JSON.parse(rawBody) as {
      action?: unknown
      payload?: unknown
    }
    const action = String(parsed.action ?? '').trim()
    if (!isKtahvMutationAction(action)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported booking action' },
        { status: 400 },
      )
    }
    if (!parsed.payload || typeof parsed.payload !== 'object' || Array.isArray(parsed.payload)) {
      return NextResponse.json(
        { success: false, error: 'A valid action payload is required' },
        { status: 400 },
      )
    }

    const payload = parsed.payload as Record<string, unknown>
    const bookingId = extractBookingId(payload)
    if (!/^[A-Za-z0-9._/-]{1,100}$/.test(bookingId)) {
      return NextResponse.json(
        { success: false, error: 'A valid booking ID is required' },
        { status: 400 },
      )
    }

    const booking = await getKtahvBookingAccessRecord(bookingId)
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 },
      )
    }
    if (!canPerformKtahvMutation(sessionUser, action, booking.assignedTo)) {
      return forbiddenResponse()
    }

    const { url, token } = getRequiredIntegrationConfig()
    url.searchParams.set('action', action)
    const requestId = randomUUID()
    const actor = {
      id: sessionUser.id ?? null,
      name: sessionUser.name ?? null,
      email: sessionUser.email ?? null,
    }
    const upstreamPayload = {
      ...payload,
      uploadedBy: actor.name,
      uploadedByEmail: actor.email,
      _audit: {
        requestId,
        actor,
        action,
        bookingId,
        occurredAt: new Date().toISOString(),
      },
    }

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kairali-Integration-Token': token,
        'X-Kairali-Request-Id': requestId,
      },
      body: JSON.stringify(upstreamPayload),
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })

    const responseText = await upstream.text()
    let responseBody: Record<string, unknown> = {}
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText) as Record<string, unknown>
      } catch {
        responseBody = { message: responseText.slice(0, 500) }
      }
    }

    if (!upstream.ok || responseBody.success === false) {
      console.error('[KTAHV mutation upstream failure]', {
        requestId,
        action,
        bookingId,
        status: upstream.status,
      })
      return NextResponse.json(
        { success: false, error: 'Booking update was not accepted', requestId },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ...responseBody,
      success: true,
      requestId,
    })
  } catch (error) {
    console.error('[KTAHV mutation API]', error)
    return NextResponse.json(
      { success: false, error: 'Unable to update booking' },
      { status: 500 },
    )
  }
}
