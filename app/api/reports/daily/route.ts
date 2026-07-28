export async function GET() {
  try {
    const apiUrl =
      "https://script.google.com/macros/s/AKfycbw9IFX4CuVlHbcC2PUbNpp1ZwEmJU5oVgLKwhS6LFJqd3NDm-z-Dzgl9UZUq6YDoNmb/exec"

    console.log("[v0] Fetching daily reports from:", apiUrl)

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
      },
      redirect: "follow",
    })

    if (!response.ok) {
      console.error("[v0] HTTP Error:", response.status, response.statusText)
      // Try to parse JSON anyway, as some endpoints return data with error status codes
    }

    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      console.error("[v0] Failed to parse JSON response:", jsonError)
      return Response.json({ KTAHV: [], KAPPL: [] })
    }

    console.log("[v0] Full API response structure:", Object.keys(data))

    // Parse and organize data by company
    const ktahvData: any[] = []
    const kapplData: any[] = []

    // Parse KTAHV daily data from nested structure
    if (data?.KTAVHSheet?.["Daily Wise Report"] && Array.isArray(data.KTAVHSheet["Daily Wise Report"])) {
      data.KTAVHSheet["Daily Wise Report"].forEach((row: any[]) => {
        ktahvData.push({
          date: row[0] ? new Date(row[0]).toLocaleDateString("en-IN") : "-",
          targetLead: Number.parseInt(String(row[1] || 0)),
          freshLead: Number.parseInt(String(row[2] || 0)),
          crrLead: Number.parseInt(String(row[3] || 0)),
          actualLead: Number.parseInt(String(row[4] || 0)),
          targetNotAchieved: Number.parseFloat(String(row[5] || 0)),
        })
      })
    }

    // Parse KAPPL daily data from nested structure
    if (data?.KAPPLSheet?.["Daily Wise Report"] && Array.isArray(data.KAPPLSheet["Daily Wise Report"])) {
      data.KAPPLSheet["Daily Wise Report"].forEach((row: any[]) => {
        kapplData.push({
          date: row[0] ? new Date(row[0]).toLocaleDateString("en-IN") : "-",
          targetLead: Number.parseInt(String(row[1] || 0)),
          freshLead: Number.parseInt(String(row[2] || 0)),
          crrLead: Number.parseInt(String(row[3] || 0)),
          actualLead: Number.parseInt(String(row[4] || 0)),
          targetNotAchieved: Number.parseFloat(String(row[5] || 0)),
        })
      })
    }

    console.log("[v0] Parsed KTAHV daily data count:", ktahvData.length)
    console.log("[v0] Parsed KAPPL daily data count:", kapplData.length)

    return Response.json({
      KTAHV: ktahvData,
      KAPPL: kapplData,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching daily reports:", error.message)
    return Response.json(
      { error: "Failed to fetch daily reports", details: error.message, KTAHV: [], KAPPL: [] },
      { status: 200 }, // Return 200 even on error to avoid client-side error handling
    )
  }
}
