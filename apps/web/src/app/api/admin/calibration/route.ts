import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const search = new URL(request.url).search;
    const engineRes = await proxyToEngine(`/api/admin/calibration${search}`);
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin GET calibration — engine unreachable");
    return NextResponse.json({ history: [] }, { status: 502 });
  }
}
