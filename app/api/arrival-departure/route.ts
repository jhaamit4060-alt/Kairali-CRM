import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getKtahvBookingAccessRecord } from "@/lib/ktahv-bookings-server";
import {
  hasKtahvAction,
  isOwnKtahvBooking,
  type KtahvAction,
} from "@/lib/ktahv-permissions";
import {
  forbiddenResponse,
  getSessionUser,
  hasTrustedRequestOrigin,
  unauthenticatedResponse,
} from "@/lib/server-session";

const MAX_BODY_BYTES = 12 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 30_000;

type ArrivalDepartureAction = "arrival" | "departure";

function parseBackendPayload(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isBackendFailure(payload: any): boolean {
  if (!payload || typeof payload !== "object") return false;
  return (
    payload.success === false ||
    payload.status === "ERROR" ||
    payload.status === "FAIL" ||
    payload.status === "error" ||
    payload.status === "fail"
  );
}

function getRequiredIntegrationConfig() {
  const rawUrl = process.env.KTAHV_ARRIVAL_DEPARTURE_SCRIPT_URL?.trim();
  const token = process.env.KTAHV_ARRIVAL_DEPARTURE_SCRIPT_TOKEN?.trim();
  if (!rawUrl || !token) {
    throw new Error("Arrival/departure integration is not configured");
  }
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.hostname !== "script.google.com") {
    throw new Error(
      "KTAHV_ARRIVAL_DEPARTURE_SCRIPT_URL must be an HTTPS script.google.com URL",
    );
  }
  return { url, token };
}

function canSubmitTravelAction(
  user: NonNullable<ReturnType<typeof getSessionUser>>,
  action: ArrivalDepartureAction,
  assignedTo: string,
): boolean {
  if (user.permissions?.includes("all")) return true;
  const selfAction: KtahvAction =
    action === "arrival" ? "arrivalFlightSelf" : "departureFlightSelf";
  const allAction: KtahvAction =
    action === "arrival" ? "arrivalFlightAll" : "departureFlightAll";
  return (
    hasKtahvAction(user, allAction) ||
    (hasKtahvAction(user, selfAction) &&
      isOwnKtahvBooking(user, assignedTo))
  );
}

export async function POST(req: NextRequest) {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return unauthenticatedResponse();
  if (!hasTrustedRequestOrigin(req)) {
    return NextResponse.json(
      { success: false, message: "Untrusted request origin" },
      { status: 403 },
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { success: false, message: "Request body is too large" },
      { status: 413 },
    );
  }

  try {
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, message: "Request body is too large" },
        { status: 413 },
      );
    }
    const body = JSON.parse(rawBody);
    const action = String(body?.action || "").toLowerCase() as ArrivalDepartureAction | "";

    if (action !== "arrival" && action !== "departure") {
      return NextResponse.json(
        { success: false, message: "Invalid action for arrival/departure submission" },
        { status: 400 }
      );
    }

    const bookingId = String(body?.bookingid ?? "").trim();
    if (!/^[A-Za-z0-9._/-]{1,100}$/.test(bookingId)) {
      return NextResponse.json(
        { success: false, message: "A valid booking ID is required" },
        { status: 400 },
      );
    }
    const booking = await getKtahvBookingAccessRecord(bookingId);
    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 },
      );
    }
    if (!canSubmitTravelAction(sessionUser, action, booking.assignedTo)) {
      return forbiddenResponse();
    }

    const { url, token } = getRequiredIntegrationConfig();
    const requestId = randomUUID();
    const upstreamBody = {
      ...body,
      bookingid: booking.bookingId,
      name: booking.guestName,
      mobile: booking.mobile,
      uploadedby: sessionUser.name ?? sessionUser.email ?? "Authenticated User",
      _audit: {
        requestId,
        action,
        bookingId: booking.bookingId,
        actor: {
          id: sessionUser.id ?? null,
          name: sessionUser.name ?? null,
          email: sessionUser.email ?? null,
        },
        occurredAt: new Date().toISOString(),
      },
    };
    const gasResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kairali-Integration-Token": token,
        "X-Kairali-Request-Id": requestId,
      },
      body: JSON.stringify(upstreamBody),
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const responseText = await gasResponse.text();
    const parsed = parseBackendPayload(responseText);

    if (!gasResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Travel details were not accepted",
          requestId,
        },
        { status: 502 }
      );
    }

    if (isBackendFailure(parsed)) {
      return NextResponse.json(
        {
          success: false,
          message: parsed?.message || "Backend rejected the submission",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: parsed?.message || "Submission saved successfully",
      requestId,
    });
  } catch (error: any) {
    console.error("[POST /api/arrival-departure]", error);
    return NextResponse.json(
      { success: false, message: "Submission failed" },
      { status: 500 }
    );
  }
}
