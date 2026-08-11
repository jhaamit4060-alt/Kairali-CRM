// src/app/api/partners/route.ts
// Proxy layer between your Next.js CRM and Google Apps Script
// All GET / POST calls go through here — keeps your Apps Script URL secret

import { NextRequest, NextResponse } from 'next/server';

const APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxRd-RX7iZUcJ2yCXDAIS81d1SJXV08JkgalI8PYhv56ZuU3NevcxsoKQaPOcth5a5r/exec';
const UPSTREAM_TIMEOUT_MS = 20_000;

// ─── GET /api/partners            → fetch all rows
// ─── GET /api/partners?row=5      → fetch single row
export async function GET(req: NextRequest) {
    // One budget covers both the upstream fetch and the JSON body read.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
        const { searchParams } = new URL(req.url);
        const row = searchParams.get('row');

        const gsUrl = row
            ? `${APPS_SCRIPT_URL}?action=getRow&row=${row}`
            : `${APPS_SCRIPT_URL}?action=getAll`;

        const res = await fetch(gsUrl, { cache: 'no-store', signal: controller.signal });

        if (!res.ok) {
            // Log the status only, then parse anyway so the passthrough shape is unchanged.
            console.error('[GET /api/partners] upstream returned status', res.status);
        }

        const json = await res.json();

        return NextResponse.json(json);
    } catch (err: any) {
        if (err?.name === 'AbortError') {
            console.error('[GET /api/partners] upstream request timed out');
            return NextResponse.json({ status: 'error', message: 'Upstream timed out' }, { status: 504 });
        }

        console.error('[GET /api/partners] upstream request failed');
        return NextResponse.json({ status: 'error', message: 'Fetch failed' }, { status: 500 });
    } finally {
        clearTimeout(timeout);
    }
}

// ─── POST /api/partners           → create new row
// ─── POST /api/partners (with _rowIndex in body) → update existing row
export async function POST(req: NextRequest) {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
        const body = await req.json();

        // One budget covers both the upstream fetch and the JSON body read.
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // Apps Script needs text/plain
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        if (!res.ok) {
            // Log the status only, then parse anyway so the passthrough shape is unchanged.
            console.error('[POST /api/partners] upstream returned status', res.status);
        }

        // Apps Script with no-cors returns opaque; but since we call server-side
        // there's no CORS issue — we get a real response here
        const json = await res.json();
        return NextResponse.json(json);
    } catch (err: any) {
        if (err?.name === 'AbortError') {
            console.error('[POST /api/partners] upstream request timed out');
            return NextResponse.json({ status: 'error', message: 'Upstream timed out' }, { status: 504 });
        }

        console.error('[POST /api/partners] upstream request failed');
        return NextResponse.json({ status: 'error', message: 'Submit failed' }, { status: 500 });
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}
