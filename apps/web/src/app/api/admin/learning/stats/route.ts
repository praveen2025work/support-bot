import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const res = await proxyToEngine(
      `/api/admin/learning/stats?${searchParams.toString()}`,
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to proxy learning stats request" },
      { status: 500 },
    );
  }
}
