import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookieValue } from "@/lib/session";

const GAS_BOOKINGS_URL =
    "https://script.google.com/macros/s/AKfycbzG_1Y18INn0l0mNXoPtNH50s24WjpGq_WIGeKkUcWcMWELSvcK7cHmxtS4iUmiel6eqA/exec";

// Always hit GAS fresh — this data changes as new bookings/checkouts happen.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const userCookie = req.cookies.get("kairali_user")?.value;
        if (!userCookie) {
            return NextResponse.json(
                { success: false, error: "Access denied: Not logged in" },
                { status: 401 }
            );
        }

        const user = verifySessionCookieValue(userCookie);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Access denied: Invalid session" },
                { status: 401 }
            );
        }

        // Determine if user is admin or has explicit read access
        const isAdmin =
            user.permissions.includes("all") ||
            user.permissions.includes("fms.admin") ||
            ["super_admin", "admin"].includes(user.role);

        const hasReadPermission =
            isAdmin ||
            user.permissions.includes("crr_fms.view") ||
            user.permissions.includes("fms.view") ||
            user.permissions.includes("bookings.view") ||
            user.permissions.some((p: string) => p.startsWith("crr_fms.stage"));

        if (!hasReadPermission) {
            return NextResponse.json(
                { success: false, error: "Access denied: Insufficient permissions" },
                { status: 403 }
            );
        }

        const res = await fetch(GAS_BOOKINGS_URL, {
            method: "GET",
            cache: "no-store",
        });

        if (!res.ok) {
            console.error("[crr-calling/bookings] GAS returned status", res.status);
            return NextResponse.json(
                { success: false, error: `Booking source returned ${res.status}` },
                { status: 502 }
            );
        }

        const json = await res.json();

        if (!json?.success) {
            console.error("[crr-calling/bookings] GAS payload missing success:true", json);
            return NextResponse.json(
                { success: false, error: "Booking source returned an unexpected payload" },
                { status: 502 }
            );
        }

        // Pass the { success, count, data } shape straight through.
        return NextResponse.json(json);
    } catch (err) {
        console.error("[crr-calling/bookings] fetch failed:", err);
        return NextResponse.json(
            { success: false, error: "Could not reach the booking source" },
            { status: 500 }
        );
    }
}

// NEW — passthrough for saving stage form data to GAS (doPost)
export async function POST(req: NextRequest) {
    try {
        const userCookie = req.cookies.get("kairali_user")?.value;
        if (!userCookie) {
            return NextResponse.json(
                { success: false, error: "Access denied: Not logged in" },
                { status: 403 }
            );
        }

        const user = verifySessionCookieValue(userCookie);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Access denied: Invalid session" },
                { status: 403 }
            );
        }

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { success: false, error: "Malformed JSON payload" },
                { status: 400 }
            );
        }

        // Validate body shape
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json(
                { success: false, error: "Request body must be a non-null plain object" },
                { status: 400 }
            );
        }

        const { bookingId, stage, fields } = body;

        // Validate bookingId
        if (!bookingId || typeof bookingId !== "string" || bookingId.trim() === "") {
            return NextResponse.json(
                { success: false, error: "Missing or invalid bookingId" },
                { status: 400 }
            );
        }

        // Validate stage range (1 to 11)
        if (typeof stage !== "number" || stage < 1 || stage > 11 || !Number.isInteger(stage)) {
            return NextResponse.json(
                { success: false, error: "Invalid stage. Must be an integer between 1 and 11" },
                { status: 400 }
            );
        }

        // Validate fields object
        if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
            return NextResponse.json(
                { success: false, error: "Missing or invalid fields object" },
                { status: 400 }
            );
        }

        // Determine elevated permissions from the authenticated session
        const isAdminRole =
            user.permissions.includes("all") ||
            user.permissions.includes("fms.admin") ||
            ["super_admin", "admin"].includes(user.role);

        // Verify stage permission
        const isAuthorized = isAdminRole || (user.permissions || []).includes(`crr_fms.stage${stage}`);
        if (!isAuthorized) {
            return NextResponse.json(
                { success: false, error: "Access denied: Insufficient permissions" },
                { status: 403 }
            );
        }

        const res = await fetch(GAS_BOOKINGS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                bookingId,
                stage,
                fields,
                adminOverride: isAdminRole,
            }),
        });

        const json = await res.json();

        if (!res.ok || !json?.success) {
            console.error("[crr-calling/bookings] GAS save failed", json);
            return NextResponse.json(
                { success: false, error: json?.error || "Booking source rejected the save" },
                { status: 502 }
            );
        }

        return NextResponse.json(json);
    } catch (err) {
        console.error("[crr-calling/bookings] POST failed:", err);
        return NextResponse.json(
            { success: false, error: "Could not save stage data" },
            { status: 500 }
        );
    }
}