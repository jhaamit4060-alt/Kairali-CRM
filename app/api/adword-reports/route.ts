import { NextResponse } from "next/server"

// ⚠️ Better: move this to env variable in production
const ADWORD_GAS_URL =
    "https://script.google.com/macros/s/AKfycbzXE_P1niSAI9M9UpAqbiRR7uXTiGjMqJjokH8CKBc-QddbUm9JV5XvmRbP0qgq3thUWA/exec"

const COMPANIES = ["KTAHV", "KAPPL", "VILLARAAG"]

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const requestedCompany = searchParams.get("company")

    // If company param provided and valid → fetch only that
    // Else → fetch all companies
    const companiesToFetch =
        requestedCompany && COMPANIES.includes(requestedCompany)
            ? [requestedCompany]
            : COMPANIES

    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 20000)

        const results = await Promise.all(
            companiesToFetch.map(async (company) => {
                const res = await fetch(
                    `${ADWORD_GAS_URL}?company=${company}`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                )

                if (!res.ok) {
                    throw new Error(`GAS error for ${company}: ${res.status}`)
                }

                const json = await res.json()

                return {
                    company,
                    data: json?.data ?? [],
                }
            })
        )

        clearTimeout(timeout)

        return NextResponse.json({
            success: true,
            data: results,
        })
    } catch (error) {
        console.error("[adword-reports] fetch error:", error)

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch adword data",
            },
            { status: 500 }
        )
    }
}
