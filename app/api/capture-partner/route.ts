import { NextRequest, NextResponse } from "next/server"

const GAS_URL =
    "https://script.google.com/macros/s/AKfycbxRd-RX7iZUcJ2yCXDAIS81d1SJXV08JkgalI8PYhv56ZuU3NevcxsoKQaPOcth5a5r/exec"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        const gasRes = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            redirect: "follow",
        })

        let gasJson: any = {}
        try {
            const text = await gasRes.text()
            gasJson = JSON.parse(text)
        } catch {
            gasJson = { status: "success", action: "created" }
        }

        return NextResponse.json(gasJson)
    } catch (err: any) {
        console.error("[capture-partner] error:", err)
        return NextResponse.json(
            { status: "error", message: err?.message || "Server error" },
            { status: 500 }
        )
    }
}