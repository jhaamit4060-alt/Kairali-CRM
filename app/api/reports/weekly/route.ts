export async function GET() {
  try {
    const apiUrl =
      "https://script.google.com/macros/s/AKfycbw9IFX4CuVlHbcC2PUbNpp1ZwEmJU5oVgLKwhS6LFJqd3NDm-z-Dzgl9UZUq6YDoNmb/exec"

    console.log("[v0] Fetching weekly reports from:", apiUrl)

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

    // Parse and organize data by company
    const ktahvData: any[] = []
    const kapplData: any[] = []

    // Parse KTAHV weekly data from nested structure
    if (data?.KTAVHSheet?.["Weekly Report"] && Array.isArray(data.KTAVHSheet["Weekly Report"])) {
      data.KTAVHSheet["Weekly Report"].forEach((row: any[]) => {
        ktahvData.push({
          date: row[0] ? new Date(row[0]).toLocaleDateString("en-IN") : String(row[0] || "-"),
          targetLead: Number.parseInt(String(row[1] || 0)),
          freshLead: Number.parseInt(String(row[2] || 0)),
          crrLead: Number.parseInt(String(row[3] || 0)),
          actualLead: Number.parseInt(String(row[4] || 0)),
          targetNotAchieved: Number.parseFloat(String(row[5] || 0)),
        })
      })
    }

    // Parse KAPPL weekly data from nested structure
    if (data?.KAPPLSheet?.["Weekly Report"] && Array.isArray(data.KAPPLSheet["Weekly Report"])) {
      data.KAPPLSheet["Weekly Report"].forEach((row: any[]) => {
        kapplData.push({
          date: row[0] ? new Date(row[0]).toLocaleDateString("en-IN") : String(row[0] || "-"),
          targetLead: Number.parseInt(String(row[1] || 0)),
          freshLead: Number.parseInt(String(row[2] || 0)),
          crrLead: Number.parseInt(String(row[3] || 0)),
          actualLead: Number.parseInt(String(row[4] || 0)),
          targetNotAchieved: Number.parseFloat(String(row[5] || 0)),
        })
      })
    }

    console.log("[v0] Parsed KTAHV weekly data count:", ktahvData.length)
    console.log("[v0] Parsed KAPPL weekly data count:", kapplData.length)

    return Response.json({
      KTAHV: ktahvData,
      KAPPL: kapplData,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching weekly reports:", error.message)
    return Response.json(
      { error: "Failed to fetch weekly reports", details: error.message, KTAHV: [], KAPPL: [] },
      { status: 200 }, // Return 200 even on error to avoid client-side error handling
    )
  }
}
