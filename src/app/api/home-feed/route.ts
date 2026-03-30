import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const userId = request.nextUrl.searchParams.get("userId") || "anonymous";
    const engineRes = await proxyToEngine(
      `/api/home-feed?groupId=${encodeURIComponent(groupId)}&userId=${encodeURIComponent(userId)}`,
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Failed to reach engine",
      },
      { status: 502 },
    );
  }
}
