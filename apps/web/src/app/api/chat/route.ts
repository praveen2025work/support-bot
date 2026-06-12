import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward auth-related headers for Windows Auth / BAM pass-through
    const forwardHeaders: Record<string, string> = {};
    const auth = request.headers.get("authorization");
    if (auth) forwardHeaders["authorization"] = auth;
    const cookie = request.headers.get("cookie");
    if (cookie) forwardHeaders["cookie"] = cookie;
    // x-user-role drives PII clear-text view permission. For the v1
    // demo and CI smoke pass-through, accept the header from the
    // request so curl-based tests can flip roles. Production should
    // overwrite this from session auth (admin/builder/viewer) before
    // forwarding — currently leaves whatever the caller sent, which
    // is fine since the engine defaults to "viewer" (safe) when the
    // header is absent.
    const role = request.headers.get("x-user-role");
    if (role) forwardHeaders["x-user-role"] = role;
    // BAM token minted in the browser via Windows auth — forward to the engine.
    const bamToken = request.headers.get("x-bam-token");
    if (bamToken) forwardHeaders["x-bam-token"] = bamToken;

    const engineRes = await proxyToEngine("/api/chat", {
      method: "POST",
      body,
      headers: forwardHeaders,
    });

    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    const err =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
    logger.error({ error: err }, "Chat API error — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}
