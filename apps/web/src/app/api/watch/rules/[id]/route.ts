import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const body = await request.json();
    const engineRes = await proxyToEngine(
      `/api/watch/rules/${encodeURIComponent(id)}?groupId=${encodeURIComponent(groupId)}`,
      { method: "PATCH", body },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const engineRes = await proxyToEngine(
      `/api/watch/rules/${encodeURIComponent(id)}?groupId=${encodeURIComponent(groupId)}`,
      { method: "DELETE" },
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
