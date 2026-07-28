// src/app/api/meetings/audio/route.ts
// Proxies Google Drive audio with proper HTTP Range support so <audio> can
// seek, show duration, and play. Fixes: only send Content-Range on 206 (Range)
// responses — sending it on a plain 200 confuses browser duration detection.

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'

function getDriveClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  return google.drive({ version: 'v3', auth })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('id')
    if (!fileId) return new NextResponse('Missing file id', { status: 400 })

    const drive = getDriveClient()

    // ── 1. File metadata (size + mimeType) ────────────────────────────────────
    const meta = await drive.files.get({
      fileId,
      fields:            'size, mimeType, name',
      supportsAllDrives: true,
    })
    const totalSize = parseInt(meta.data.size || '0')
    let   mimeType  = meta.data.mimeType || 'audio/mpeg'
    // Normalize generic types so the browser picks the right decoder
    if (mimeType === 'application/octet-stream') mimeType = 'audio/mpeg'

    // ── 2. Parse Range header ─────────────────────────────────────────────────
    const rangeHeader = req.headers.get('range')
    let start = 0
    let end   = totalSize - 1
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        start = parseInt(match[1])
        end   = match[2] ? parseInt(match[2]) : totalSize - 1
      }
    }
    const chunkSize = end - start + 1

    // ── 3. Stream the requested bytes from Drive ──────────────────────────────
    const driveRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream', headers: { Range: `bytes=${start}-${end}` } }
    )

    const stream   = driveRes.data as any
    const readable = new ReadableStream({
      start(controller) {
        stream.on('data',  (chunk: Buffer) => controller.enqueue(chunk))
        stream.on('end',   ()             => controller.close())
        stream.on('error', (err: Error)  => controller.error(err))
      },
    })

    // ── 4. Headers — ONLY add Content-Range on a 206 (Range) response ─────────
    const headers: Record<string, string> = {
      'Content-Type':   mimeType,
      'Content-Length': String(chunkSize),
      'Accept-Ranges':  'bytes',
      'Cache-Control':  'public, max-age=3600',
    }
    if (rangeHeader) {
      headers['Content-Range'] = `bytes ${start}-${end}/${totalSize}`
    }

    return new NextResponse(readable, {
      status: rangeHeader ? 206 : 200,
      headers,
    })

  } catch (err: any) {
    console.error('[/api/meetings/audio]', err)
    return new NextResponse(err.message || 'Audio stream failed', { status: 500 })
  }
}
