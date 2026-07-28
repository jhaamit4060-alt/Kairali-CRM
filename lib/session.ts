import { createHmac, timingSafeEqual } from 'crypto'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days — matches previous cookie lifetime

function sign(encodedPayload: string): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

// Signed session cookie value: "<base64url payload>.<hmac signature>"
// The payload embeds its own expiry so a captured cookie can't be replayed
// past its lifetime even if the Set-Cookie Max-Age is stripped or edited.
export function createSessionCookieValue(user: unknown): string {
  const payload = JSON.stringify({ user, exp: Date.now() + SESSION_TTL_MS })
  const encoded = Buffer.from(payload, 'utf8').toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

export function verifySessionCookieValue(raw: string): any | null {
  const parts = raw.split('.')
  if (parts.length !== 2) return null
  const [encoded, signature] = parts

  let expectedSig: string
  try {
    expectedSig = sign(encoded)
  } catch {
    return null
  }

  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!payload.exp || Date.now() > payload.exp) return null
    return payload.user
  } catch {
    return null
  }
}
