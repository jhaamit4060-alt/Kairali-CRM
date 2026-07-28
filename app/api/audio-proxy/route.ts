import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) return new NextResponse("Missing url", { status: 400 });

    const response = await fetch(decodeURIComponent(url));
    if (!response.ok) return new NextResponse("Failed to fetch audio", { status: 502 });

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    return new NextResponse(buffer, {
        headers: {
            "Content-Type": response.headers.get("Content-Type") || "audio/ogg",
            "Access-Control-Allow-Origin": "*",
        },
    });
}
