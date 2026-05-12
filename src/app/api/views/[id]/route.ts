import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const { id } = await Promise.resolve(params);
    const engineRes = await proxyToEngine(
      `/api/views/${encodeURIComponent(id)}`,
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Fetch snapshot — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}
