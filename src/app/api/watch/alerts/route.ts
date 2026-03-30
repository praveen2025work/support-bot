import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const limit = request.nextUrl.searchParams.get("limit") || "50";
    const engineRes = await proxyToEngine(
      `/api/watch/alerts?groupId=${encodeURIComponent(groupId)}&limit=${encodeURIComponent(limit)}`,
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: [],
        unreadCount: 0,
        error: "Failed to reach engine",
      },
      { status: 502 },
    );
  }
}
