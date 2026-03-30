import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queryName: string }> },
) {
  try {
    const { queryName } = await params;
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const engineRes = await proxyToEngine(
      `/api/catalog/${encodeURIComponent(queryName)}?groupId=${encodeURIComponent(groupId)}`,
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to load query detail" },
      { status: 502 },
    );
  }
}
