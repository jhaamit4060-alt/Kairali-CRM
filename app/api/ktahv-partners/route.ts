import { NextResponse } from "next/server"

const GAS_URL = process.env.GAS_URL!

export async function GET() {
    try {
        const res = await fetch(`${GAS_URL}?action=travel`, { cache: "no-store" })

        if (!res.ok) {
            return NextResponse.json(
                { status: "error", message: `GAS responded with ${res.status}` },
                { status: 502 }
            )
        }

        const json = await res.json()
        return NextResponse.json(json)

    } catch (error) {
        console.error("[ktahv-partners] fetch error:", error)
        return NextResponse.json(
            { status: "error", message: "Failed to fetch travel agents" },
            { status: 500 }
        )
    }
}
