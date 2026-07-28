import { NextResponse } from "next/server"

const GAS_URL = process.env.GAS_URL!

export async function GET() {
    try {
        const res = await fetch(`${GAS_URL}?action=b2b`, { cache: "no-store" })

        if (!res.ok) {
            return NextResponse.json(
                { status: "error", message: `GAS responded with ${res.status}` },
                { status: 502 }
            )
        }

        const json = await res.json()
        return NextResponse.json(json)

    } catch (error) {
        console.error("[b2b-leads] fetch error:", error)
        return NextResponse.json(
            { status: "error", message: "Failed to fetch B2B leads" },
            { status: 500 }
        )
    }
}
