import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type_proxy'); // 'sent' or 'all'

    // Remove our proxy-specific param
    const forwardParams = new URLSearchParams(searchParams.toString());
    forwardParams.delete('type_proxy');

    const baseUrl = type === 'sent'
        ? "https://script.google.com/macros/s/AKfycbym45pQfgcyqKRHLMtMt3gc0KWMcfPiHYngBZuswB7frxb7t4BMfxlVG1zFbe50bMH0/exec"
        : "https://script.google.com/macros/s/AKfycbyZgL_rJ8A_8snRTfecPOs4fWtYVHvU6735g1scUgwcil0S4JpUK2tILv6MQuDhQEeixg/exec";

    try {
        const targetUrl = `${baseUrl}?${forwardParams.toString()}`;
        console.log('[Voice Proxy] Fetching:', targetUrl);

        const res = await fetch(targetUrl, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        console.log('[Voice Proxy] Status:', res.status);

        if (!res.ok) {
            const errText = await res.text();
            console.error('[Voice Proxy] Target error body:', errText.slice(0, 200));
            return NextResponse.json({ success: false, error: `Target API returned ${res.status}` }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err: any) {
        console.error('[Voice Proxy Error]', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
