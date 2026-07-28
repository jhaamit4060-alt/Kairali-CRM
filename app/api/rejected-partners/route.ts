import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export const runtime = "nodejs"

const DEFAULT_GAS_READ_URL =
    "https://script.google.com/macros/s/AKfycbwiJWIPRo4CgZIJNtTGbNk-MMfCojgJIO3R4iuzbIekTQ5QFgsTscwIlsrWzJKflUuV/exec"
const LOCAL_REJECTED_FILE = path.join(process.cwd(), "data", "rejected-partners.json")

const GAS_READ_URL =
    process.env.GAS_URL?.trim() ||
    process.env.NEXT_PUBLIC_GAS_URL?.trim() ||
    DEFAULT_GAS_READ_URL

const GAS_WRITE_URL =
    process.env.GAS_REJECT_URL?.trim() ||
    process.env.GAS_WRITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_GAS_REJECT_URL?.trim() ||
    process.env.NEXT_PUBLIC_GAS_WRITE_URL?.trim() ||
    DEFAULT_GAS_READ_URL

type RejectedPartner = {
    _rowIndex?: number
    Timestamp?: string
    Lead_ID: string
    Business_Name?: string
    Contact_Person?: string
    Email?: string
    Phone?: string
    Country?: string
    Category?: string
    Client_Stage?: string
    Priority?: string
    Assigned_To?: string
    Potential_Business_Rs?: string
    Rejection_Category: string
    Rejection_Remarks?: string
    Rejected_By_Name?: string
}

async function parseGASResponse(res: Response) {
    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
        return res.json()
    }

    const text = await res.text()
    const lower = text.toLowerCase()
    const isHtml = lower.includes("<html") || lower.includes("<!doctype html")

    if (isHtml) {
        if (lower.includes("do not have permission to access the requested document")) {
            return {
                status: "error",
                message: "Error: You do not have permission to access the requested document.",
            }
        }
        return {
            status: "error",
            message: "Apps Script returned non-JSON HTML response.",
        }
    }

    try {
        return JSON.parse(text)
    } catch {
        return {
            status: "error",
            message: text || (res.ok ? "Operation completed" : `GAS responded with ${res.status}`),
        }
    }
}

function normalizeRejected(item: Partial<RejectedPartner>): RejectedPartner {
    const now = new Date().toISOString()
    return {
        Lead_ID: String(item.Lead_ID || "").trim(),
        Rejection_Category: String(item.Rejection_Category || "").trim(),
        Rejection_Remarks: String(item.Rejection_Remarks || ""),
        Business_Name: String(item.Business_Name || ""),
        Contact_Person: String(item.Contact_Person || ""),
        Email: String(item.Email || ""),
        Phone: String(item.Phone || ""),
        Country: String(item.Country || ""),
        Category: String(item.Category || ""),
        Client_Stage: String(item.Client_Stage || ""),
        Priority: String(item.Priority || ""),
        Assigned_To: String(item.Assigned_To || ""),
        Potential_Business_Rs: String(item.Potential_Business_Rs || ""),
        Rejected_By_Name: String(item.Rejected_By_Name || "Unknown"),
        Timestamp: item.Timestamp || now,
    }
}

function sortRejected(items: RejectedPartner[]) {
    return [...items].sort((a, b) => {
        const aTime = new Date(a.Rejected_At || a.Timestamp || 0).getTime() || 0
        const bTime = new Date(b.Rejected_At || b.Timestamp || 0).getTime() || 0
        return bTime - aTime
    })
}

function dedupeRejected(items: RejectedPartner[]) {
    const seen = new Set<string>()
    const out: RejectedPartner[] = []
    for (const item of items) {
        const key = `${item.Lead_ID}::${item.Timestamp || ""}::${item.Rejection_Category}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push(item)
    }
    return out.map((item, index) => ({ ...item, _rowIndex: index + 2 }))
}

async function readLocalRejected(): Promise<RejectedPartner[]> {
    try {
        const raw = await fs.readFile(LOCAL_REJECTED_FILE, "utf8")
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return dedupeRejected(sortRejected(parsed.map((p) => normalizeRejected(p))))
    } catch {
        return []
    }
}

async function writeLocalRejected(items: RejectedPartner[]) {
    await fs.mkdir(path.dirname(LOCAL_REJECTED_FILE), { recursive: true })
    await fs.writeFile(LOCAL_REJECTED_FILE, JSON.stringify(items, null, 2), "utf8")
}

// GET - fetch all rejected partners
export async function GET() {
    try {
        const localData = await readLocalRejected()
        const res = await fetch(`${GAS_READ_URL}?action=rejected`, { cache: "no-store" })

        if (!res.ok) {
            return NextResponse.json({ status: "success", data: localData, source: "local_only" })
        }

        const json = await parseGASResponse(res)
        if (String(json?.status || "").toLowerCase() !== "success") {
            return NextResponse.json({ status: "success", data: localData, source: "local_only" })
        }

        const gasData = Array.isArray(json?.data) ? json.data.map((p: Partial<RejectedPartner>) => normalizeRejected(p)) : []
        const merged = dedupeRejected(sortRejected([...gasData, ...localData]))
        return NextResponse.json({ ...json, data: merged, source: "gas_plus_local" })

    } catch (error) {
        console.error("[rejected-partners GET] fetch error:", error)
        const localData = await readLocalRejected()
        return NextResponse.json({ status: "success", data: localData, source: "local_only" })
    }
}

// POST - reject a partner
export async function POST(request: Request) {
    let normalized: RejectedPartner | null = null
    try {
        const body = await request.json()

        if (!body.Lead_ID || !body.Rejection_Category) {
            return NextResponse.json(
                { status: "error", message: "Lead_ID and Rejection_Category are required" },
                { status: 400 }
            )
        }

        normalized = normalizeRejected(body)
        const payload = JSON.stringify({ action: "reject", ...normalized })
        const tried = new Set<string>()
        const candidates = [GAS_WRITE_URL, GAS_READ_URL].filter((u): u is string => Boolean(u && !tried.has(u) && tried.add(u)))

        let lastErrorMessage = "Failed to reject partner"

        for (const url of candidates) {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: payload,
                cache: "no-store",
            })

            if (!res.ok) {
                lastErrorMessage = `GAS responded with ${res.status}`
                continue
            }

            const json = await parseGASResponse(res)
            const status = String(json?.status || "").toLowerCase()
            const message = String(json?.message || "")

            if (status === "success") {
                const localData = await readLocalRejected()
                const merged = dedupeRejected(sortRejected([normalized, ...localData]))
                await writeLocalRejected(merged)
                return NextResponse.json({ ...json, savedTo: "gas_and_local" })
            }

            lastErrorMessage = message || "Failed to reject partner"

            // Retry with alternate script URL when current deployment lacks sheet access.
            if (message.toLowerCase().includes("do not have permission to access the requested document")) {
                continue
            }

            continue
        }

        const localData = await readLocalRejected()
        const merged = dedupeRejected(sortRejected([normalized, ...localData]))
        await writeLocalRejected(merged)

        return NextResponse.json({
            status: "success",
            message: "Rejected partner saved locally. Google Sheet sync failed due permission.",
            savedTo: "local_only",
            gasError: lastErrorMessage,
        })

    } catch (error) {
        console.error("[rejected-partners POST] fetch error:", error)
        if (normalized) {
            const localData = await readLocalRejected()
            const merged = dedupeRejected(sortRejected([normalized, ...localData]))
            await writeLocalRejected(merged)
            return NextResponse.json({
                status: "success",
                message: "Rejected partner saved locally. Google Sheet sync failed.",
                savedTo: "local_only",
            })
        }
        return NextResponse.json({ status: "error", message: "Failed to reject partner" }, { status: 500 })
    }
}
