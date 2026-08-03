import { NextRequest, NextResponse } from "next/server";
import {
    getPermissions,
    getSessionUserResult,
    hasAdminRole,
    hasAnyPermission,
    hasPermission,
} from "@/lib/authz";

const GAS_BOOKINGS_URL =
    "https://script.google.com/macros/s/AKfycbzG_1Y18INn0l0mNXoPtNH50s24WjpGq_WIGeKkUcWcMWELSvcK7cHmxtS4iUmiel6eqA/exec";

const UPSTREAM_TIMEOUT_MS = 20_000;

// Always hit GAS fresh — this data changes as new bookings/checkouts happen.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
        // Same cookie, same verifier as before; the result keeps "no cookie" and
        // "cookie did not verify" apart so the two 401 bodies below stay distinct.
        const session = getSessionUserResult(req);

        if (session.state === "missing") {
            return NextResponse.json(
                { success: false, error: "Access denied: Not logged in" },
                { status: 401 }
            );
        }

        if (session.state === "invalid") {
            return NextResponse.json(
                { success: false, error: "Access denied: Invalid session" },
                { status: 401 }
            );
        }

        const user = session.user;

        // Determine if user is admin or has explicit read access.
        //
        // Same rule as before, now read through `lib/authz.ts`. `hasAnyPermission`
        // honours the `all` wildcard, so it covers the `includes("all")` test it
        // replaces, and `'raw'` is this route's own uncoerced
        // `["super_admin","admin"].includes(user.role)` — plain `Admin` is still
        // rejected here exactly as it always was. Nothing folds (matrix M9, D1).
        //
        // HARDENING, intentional: `getPermissions` returns `[]` for a session whose
        // `permissions` field is missing or not an array, and drops non-string
        // elements. The old direct `user.permissions.includes(...)` /
        // `.some(p => p.startsWith(...))` threw on those payloads and the catch below
        // turned them into a 500 "Could not reach the booking source". They now take
        // the deterministic 403 an unusable permission set deserves.
        const permissions = getPermissions(user);

        const isAdmin =
            hasAnyPermission(user, ["fms.admin"]) ||
            hasAdminRole(user, "raw");

        const hasReadPermission =
            isAdmin ||
            hasAnyPermission(user, ["crr_fms.view", "fms.view", "bookings.view"]) ||
            permissions.some((p) => p.startsWith("crr_fms.stage"));

        if (!hasReadPermission) {
            return NextResponse.json(
                { success: false, error: "Access denied: Insufficient permissions" },
                { status: 403 }
            );
        }

        // One controller/timer spans the fetch AND the full JSON body read, so a
        // slow upstream can't stall the response past the 20s budget after
        // headers arrive.
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

        const res = await fetch(GAS_BOOKINGS_URL, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
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
            // Status only — the upstream payload may carry booking data.
            console.error("[crr-calling/bookings] GAS payload missing success:true");
            return NextResponse.json(
                { success: false, error: "Booking source returned an unexpected payload" },
                { status: 502 }
            );
        }

        // Pass the { success, count, data } shape straight through.
        return NextResponse.json(json);
    } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            console.error("[crr-calling/bookings] GAS request timed out");
            return NextResponse.json(
                { success: false, error: "Booking source timed out" },
                { status: 504 }
            );
        }

        console.error("[crr-calling/bookings] fetch failed");
        return NextResponse.json(
            { success: false, error: "Could not reach the booking source" },
            { status: 500 }
        );
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}

// NEW — passthrough for saving stage form data to GAS (doPost)
export async function POST(req: NextRequest) {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
        // Same read as GET; this handler answers 403 rather than 401 for both
        // states, which the two branches below preserve verbatim.
        const session = getSessionUserResult(req);

        if (session.state === "missing") {
            return NextResponse.json(
                { success: false, error: "Access denied: Not logged in" },
                { status: 403 }
            );
        }

        if (session.state === "invalid") {
            return NextResponse.json(
                { success: false, error: "Access denied: Invalid session" },
                { status: 403 }
            );
        }

        const user = session.user;

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

        // Determine elevated permissions from the authenticated session.
        // Same rule, same coercion, same `all`-wildcard semantics as GET — see the
        // note there for why `'raw'` and not `normalizeRole`, and for the
        // malformed-`permissions` 500 → 403 hardening this read also applies to the
        // write path. `isAdminRole` still travels upstream as `adminOverride` below.
        const isAdminRole =
            hasAnyPermission(user, ["fms.admin"]) ||
            hasAdminRole(user, "raw");

        // Verify stage permission. `hasPermission`'s wildcard is redundant here —
        // an `all` session already satisfied `isAdminRole` and short-circuited.
        const isAuthorized = isAdminRole || hasPermission(user, `crr_fms.stage${stage}`);
        if (!isAuthorized) {
            return NextResponse.json(
                { success: false, error: "Access denied: Insufficient permissions" },
                { status: 403 }
            );
        }

        // One controller/timer spans the fetch AND the full JSON body read, so a
        // slow upstream can't stall the response past the 20s budget after
        // headers arrive.
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

        const res = await fetch(GAS_BOOKINGS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                bookingId,
                stage,
                fields,
                adminOverride: isAdminRole,
            }),
            signal: controller.signal,
        });

        const json = await res.json();

        if (!res.ok || !json?.success) {
            // Status only — never the upstream body or its error text.
            console.error("[crr-calling/bookings] GAS save failed with status", res.status);
            return NextResponse.json(
                { success: false, error: "Booking source rejected the save" },
                { status: 502 }
            );
        }

        return NextResponse.json(json);
    } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            console.error("[crr-calling/bookings] POST timed out");
            return NextResponse.json(
                { success: false, error: "Booking source timed out" },
                { status: 504 }
            );
        }

        console.error("[crr-calling/bookings] POST failed");
        return NextResponse.json(
            { success: false, error: "Could not save stage data" },
            { status: 500 }
        );
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}
