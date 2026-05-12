import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams.toString();
    const engineRes = await proxyToEngine(
      `/api/admin/schema/drift${params ? `?${params}` : ""}`,
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin GET schema/drift — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}
