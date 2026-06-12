import { NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const engineRes = await proxyToEngine("/api/admin/sources/health");
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin GET sources/health — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}
