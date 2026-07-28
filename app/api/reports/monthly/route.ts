export async function GET() {
  try {
    const apiUrl =
      "https://script.google.com/macros/s/AKfycbw9IFX4CuVlHbcC2PUbNpp1ZwEmJU5oVgLKwhS6LFJqd3NDm-z-Dzgl9UZUq6YDoNmb/exec"

    console.log("[v0] Fetching monthly reports from:", apiUrl)

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
      },
      redirect: "follow",
    })

    if (!response.ok) {
      console.error("[v0] HTTP Error:", response.status, response.statusText)
    }

    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      console.error("[v0] Failed to parse JSON response:", jsonError)
      return Response.json({ KTAHV: [], KAPPL: [] })
    }

    const ktahvData: any[] = []
    const kapplData: any[] = []

    // Parse KTAHV monthly data from nested structure
    if (data?.KTAVHSheet?.["Monthly Report"] && Array.isArray(data.KTAVHSheet["Monthly Report"])) {
      data.KTAVHSheet["Monthly Report"].forEach((row: any[]) => {
        ktahvData.push({
          date: String(row[0] || "-"),
          targetLead: Number.parseInt(String(row[1] || 0)),
          freshLead: Number.parseInt(String(row[2] || 0)),
          crrLead: Number.parseInt(String(row[3] || 0)),
          actualLead: Number.parseInt(String(row[4] || 0)),
          targetNotAchieved: Number.parseFloat(String(row[5] || 0)),
        })
      })
    }

    // Parse KAPPL monthly data from nested structure
    if (data?.KAPPLSheet?.["Monthly Report"] && Array.isArray(data.KAPPLSheet["Monthly Report"])) {
      data.KAPPLSheet["Monthly Report"].forEach((row: any[]) => {
        kapplData.push({
          date: String(row[0] || "-"),
          targetLead: Number.parseInt(String(row[1] || 0)),
          freshLead: Number.parseInt(String(row[2] || 0)),
          crrLead: Number.parseInt(String(row[3] || 0)),
          actualLead: Number.parseInt(String(row[4] || 0)),
          targetNotAchieved: Number.parseFloat(String(row[5] || 0)),
        })
      })
    }

    console.log("[v0] Parsed KTAHV monthly data count:", ktahvData.length)
    console.log("[v0] Parsed KAPPL monthly data count:", kapplData.length)

    return Response.json({
      KTAHV: ktahvData,
      KAPPL: kapplData,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching monthly reports:", error.message)
    return Response.json(
      { error: "Failed to fetch monthly reports", details: error.message, KTAHV: [], KAPPL: [] },
      { status: 200 },
    )
  }
}
