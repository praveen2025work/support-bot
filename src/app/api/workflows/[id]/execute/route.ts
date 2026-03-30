import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const engineRes = await proxyToEngine(
      `/api/workflows/${encodeURIComponent(id)}/execute?groupId=${encodeURIComponent(groupId)}`,
      {
        method: "POST",
        body,
      },
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
