// src/app/api/partners/route.ts
// Proxy layer between your Next.js CRM and Google Apps Script
// All GET / POST calls go through here — keeps your Apps Script URL secret

import { NextRequest, NextResponse } from 'next/server';

const APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxRd-RX7iZUcJ2yCXDAIS81d1SJXV08JkgalI8PYhv56ZuU3NevcxsoKQaPOcth5a5r/exec';

// ─── GET /api/partners            → fetch all rows
// ─── GET /api/partners?row=5      → fetch single row
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const row = searchParams.get('row');

        const gsUrl = row
            ? `${APPS_SCRIPT_URL}?action=getRow&row=${row}`
            : `${APPS_SCRIPT_URL}?action=getAll`;

        const res = await fetch(gsUrl, { cache: 'no-store' });
        const json = await res.json();

        return NextResponse.json(json);
    } catch (err) {
        console.error('[GET /api/partners]', err);
        return NextResponse.json({ status: 'error', message: 'Fetch failed' }, { status: 500 });
    }
}

// ─── POST /api/partners           → create new row
// ─── POST /api/partners (with _rowIndex in body) → update existing row
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // Apps Script needs text/plain
            body: JSON.stringify(body),
        });

        // Apps Script with no-cors returns opaque; but since we call server-side
        // there's no CORS issue — we get a real response here
        const json = await res.json();
        return NextResponse.json(json);
    } catch (err) {
        console.error('[POST /api/partners]', err);
        return NextResponse.json({ status: 'error', message: 'Submit failed' }, { status: 500 });
    }
}
