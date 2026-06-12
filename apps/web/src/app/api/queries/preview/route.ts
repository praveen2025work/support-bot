import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const queryName = request.nextUrl.searchParams.get("queryName");
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const limit = request.nextUrl.searchParams.get("limit") || "5";

    if (!queryName) {
      return NextResponse.json(
        { error: "queryName required" },
        { status: 400 },
      );
    }

    const engineRes = await proxyToEngine(
      `/api/queries/preview?queryName=${encodeURIComponent(queryName)}&groupId=${encodeURIComponent(groupId)}&limit=${limit}`,
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Query preview proxy error");
    return NextResponse.json(
      { columns: [], rows: [], totalRows: 0 },
      { status: 502 },
    );
  }
}
