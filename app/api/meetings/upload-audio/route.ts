

// src/app/api/meetings/upload-audio/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { uploadAudioToDrive } from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    if (audioFile.size > 200 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file too large (max 200MB)' }, { status: 413 })
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    const fileName    = `meeting-${Date.now()}.webm`
    const mimeType    = audioFile.type || 'audio/webm'

    const { fileId, streamUrl, webViewLink } = await uploadAudioToDrive(
      audioBuffer,
      fileName,
      mimeType
    )

    return NextResponse.json({ fileId, streamUrl, webViewLink })

  } catch (err: any) {
    console.error('[/api/meetings/upload-audio]', err)
    return NextResponse.json({ error: err.message || 'Drive upload failed' }, { status: 500 })
  }
}