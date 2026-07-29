import { NextRequest, NextResponse } from 'next/server'
import { GEMINI_CONFIG, SYSTEM_PROMPT, getPromptForStage } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured in .env.local. Please add your Google AI Studio API key and restart the server.' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { name, stage, package_interested, quote_amount, notes, daysStalled, assigned_sales_rep } = body

    if (!name || !stage) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, stage' },
        { status: 400 }
      )
    }

    // Build stage-specific prompt
    const userPrompt = getPromptForStage(stage, {
      name,
      packageInterested: package_interested,
      notes,
      quoteAmount: typeof quote_amount === 'number' ? quote_amount : Number(quote_amount) || null,
      daysStalled: parseInt(daysStalled) || 0,
      representativeName: assigned_sales_rep
    })

    // Combine system prompt and user instructions for Gemini
    const fullTextPrompt = `${SYSTEM_PROMPT}\n\nUser Context:\n${userPrompt}`

    // Abort controller for 15s timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    // Fetch call to Google Gemini API
    const response = await fetch(`${GEMINI_CONFIG.apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: fullTextPrompt
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      })
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Gemini API Error Response]', errorText)
      throw new Error(`Gemini API responded with status ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const rawMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Clean up response if it wraps with quotes or whitespace
    const message = rawMessage.trim().replace(/^["']|["']$/g, '')

    return NextResponse.json({
      success: true,
      message
    })

  } catch (err: any) {
    console.error('[API Generate Follow-up Error]', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate follow-up message using Gemini' },
      { status: 500 }
    )
  }
}
