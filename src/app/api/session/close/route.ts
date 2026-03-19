import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

/**
 * POST /api/session/close
 *
 * Proxies to the engine's session close endpoint.
 * Called by `navigator.sendBeacon` on browser tab/window close.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await proxyToEngine("/api/session/close", {
      method: "POST",
      body,
      timeoutMs: 5000, // short timeout — beacon is fire-and-forget
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    // Never fail — beacons are best-effort
    return NextResponse.json({ ok: true });
  }
}
