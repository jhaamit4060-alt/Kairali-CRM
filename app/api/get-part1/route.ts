import { NextRequest, NextResponse } from "next/server"

const GAS_URL =
    "https://script.google.com/macros/s/AKfycbxRd-RX7iZUcJ2yCXDAIS81d1SJXV08JkgalI8PYhv56ZuU3NevcxsoKQaPOcth5a5r/exec"

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const leadId = searchParams.get("leadId")

    if (!leadId) {
        return NextResponse.json({ status: "error", message: "leadId required" }, { status: 400 })
    }

    try {
        const gasRes = await fetch(`${GAS_URL}?action=getAll&part=1`, {
            cache: "no-store",
            redirect: "follow",
        })

        const text = await gasRes.text()
        const j = JSON.parse(text)

        if (j.status !== "success" || !Array.isArray(j.data)) {
            return NextResponse.json({ status: "error", message: j.message || "GAS error" }, { status: 500 })
        }

        const entry = j.data.find((e: any) => e["CRM Contact ID"] === leadId) ?? null

        return NextResponse.json({ status: "success", entry })
    } catch (err: any) {
        console.error("[get-part1] error:", err)
        return NextResponse.json(
            { status: "error", message: err?.message || "Server error" },
            { status: 500 }
        )
    }
}