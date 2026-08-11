import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json()

  // Mock prescription save logic
  const prescriptionId = `P-${Date.now()}`

  console.log("Saving prescription:", { id: prescriptionId, data: body })

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return NextResponse.json({ id: prescriptionId })
}
