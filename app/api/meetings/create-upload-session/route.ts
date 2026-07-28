// src/app/api/meetings/create-upload-session/route.ts
// Creates a Google Drive resumable upload session
// Browser then uploads chunks directly to Drive — no server memory used
// Supports files up to 5TB

import { NextRequest, NextResponse } from 'next/server'

function getServiceAccountAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  const sa = JSON.parse(raw)
  return {
    clientEmail: sa.client_email as string,
    privateKey:  (sa.private_key as string).replace(/\\n/g, '\n'),
  }
}

// ── Mint a short-lived access token from service account ─────────────────────
async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss:   clientEmail,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }

  // Build JWT manually (no googleapis dependency needed in edge runtime)
  const header  = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')
  const payload = btoa(JSON.stringify(claim))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')

  // Import private key
  const keyData = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const sigInput = new TextEncoder().encode(`${header}.${payload}`)
  const sigBuf   = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, sigInput)
  const sig      = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')

  const jwt = `${header}.${payload}.${sig}`

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error('Could not get Drive access token')
  return tokenData.access_token
}

export async function POST(req: NextRequest) {
  try {
    const { fileName, mimeType, fileSize } = await req.json()

    if (!fileName) {
      return NextResponse.json({ error: 'fileName required' }, { status: 400 })
    }

    const { clientEmail, privateKey } = getServiceAccountAuth()
    const accessToken = await getAccessToken(clientEmail, privateKey)

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
    const metadata = {
      name:    fileName,
      parents: folderId ? [folderId] : [],
    }

    // Initiate resumable upload session
    const initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method:  'POST',
        headers: {
          Authorization:             `Bearer ${accessToken}`,
          'Content-Type':            'application/json',
          'X-Upload-Content-Type':   mimeType || 'audio/webm',
          ...(fileSize ? { 'X-Upload-Content-Length': String(fileSize) } : {}),
        },
        body: JSON.stringify(metadata),
      }
    )

    if (!initRes.ok) {
      const err = await initRes.text()
      throw new Error(`Drive session init failed: ${initRes.status} — ${err}`)
    }

    const uploadUrl = initRes.headers.get('location')
    if (!uploadUrl) throw new Error('No upload URL returned from Drive')

    return NextResponse.json({ uploadUrl })

  } catch (err: any) {
    console.error('[create-upload-session]', err)
    return NextResponse.json({ error: err.message || 'Failed to create upload session' }, { status: 500 })
  }
}
