import { NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const engineRes = await proxyToEngine("/api/openapi.json");
    const text = await engineRes.text();
    return new NextResponse(text, {
      status: engineRes.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error({ error }, "GET /api/openapi.json — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}
