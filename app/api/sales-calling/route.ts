import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiUrl = "https://script.google.com/macros/s/AKfycbz1wmE_4sczF7XrozAB-EYaZwmtC367uBPchMYcH_yi3UQJC5J3ANIkgTQTOQ7JzOD5nA/exec";

    console.log("Fetching sales-calling data from GAS:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
      },
      redirect: "follow",
      next: { revalidate: 0 } // Bypass Next.js fetch cache
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script API returned status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in sales-calling proxy API:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales calling data", details: error.message },
      { status: 500 }
    );
  }
}
