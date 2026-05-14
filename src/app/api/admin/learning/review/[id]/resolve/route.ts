import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const res = await proxyToEngine(
      `/api/admin/learning/review/${encodeURIComponent(id)}/resolve`,
      { method: "POST", body },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to proxy resolve request" },
      { status: 500 },
    );
  }
}
