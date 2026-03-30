import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const q = request.nextUrl.searchParams.get("q") || "";
    const qs = q
      ? `?groupId=${encodeURIComponent(groupId)}&q=${encodeURIComponent(q)}`
      : `?groupId=${encodeURIComponent(groupId)}`;
    const engineRes = await proxyToEngine(`/api/catalog${qs}`);
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { success: false, data: [], total: 0 },
      { status: 502 },
    );
  }
}
