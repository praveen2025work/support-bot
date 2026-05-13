import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function PATCH(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const engineRes = await proxyToEngine(
      `/api/watch/alerts/read-all?groupId=${encodeURIComponent(groupId)}`,
      { method: "PATCH" },
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to reach engine" },
      { status: 502 },
    );
  }
}
