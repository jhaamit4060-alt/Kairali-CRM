// src/app/api/meetings/upload-chunk/route.ts
// Proxies chunk uploads to Google Drive — browser → this route → Drive
// (Direct browser→Drive is impossible: Drive resumable URLs reject CORS preflight)

import { NextRequest, NextResponse } from 'next/server'

// Force Node.js runtime (not Edge) — Edge has a 4MB hard cap, Node allows more
export const runtime  = 'nodejs'
export const maxDuration = 60          // allow up to 60s per chunk on Vercel Pro

// ── PUT: receive one chunk, forward to Drive ─────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const uploadUrl     = searchParams.get('uploadUrl')
    const contentRange  = req.headers.get('x-content-range')
    const contentLength = req.headers.get('x-content-length')

    if (!uploadUrl) {
      return NextResponse.json({ error: 'uploadUrl required' }, { status: 400 })
    }

    const chunk = await req.arrayBuffer()

    const driveRes = await fetch(uploadUrl, {
      method:  'PUT',
      headers: {
        'Content-Length': contentLength || String(chunk.byteLength),
        'Content-Range':  contentRange  || `bytes 0-${chunk.byteLength - 1}/*`,
      },
      body: chunk,
    })

    if (driveRes.status === 308) {
      return NextResponse.json({ status: 308 }, { status: 200 })
    }

    if (driveRes.status === 200 || driveRes.status === 201) {
      const data = await driveRes.json()
      return NextResponse.json({ status: driveRes.status, fileId: data.id })
    }

    const text = await driveRes.text()
    return NextResponse.json(
      { error: `Drive chunk error: ${driveRes.status} — ${text.substring(0, 200)}` },
      { status: driveRes.status >= 500 ? 502 : 400 }
    )

  } catch (err: any) {
    console.error('[upload-chunk PUT]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── POST: resume offset check (tiny body) ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { uploadUrl, totalSize } = await req.json()
    if (!uploadUrl) return NextResponse.json({ error: 'uploadUrl required' }, { status: 400 })

    const driveRes = await fetch(uploadUrl, {
      method:  'PUT',
      headers: { 'Content-Range': `bytes */${totalSize}`, 'Content-Length': '0' },
    })

    if (driveRes.status === 308) {
      const range      = driveRes.headers.get('range')
      const resumeFrom = range ? parseInt(range.split('-')[1]) + 1 : 0
      return NextResponse.json({ resumeFrom })
    }

    if (driveRes.status === 200 || driveRes.status === 201) {
      const data = await driveRes.json()
      return NextResponse.json({ resumeFrom: totalSize, fileId: data.id, complete: true })
    }

    return NextResponse.json({ resumeFrom: 0 })

  } catch {
    return NextResponse.json({ resumeFrom: 0 })
  }
}
