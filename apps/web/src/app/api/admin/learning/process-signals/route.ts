import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await proxyToEngine(`/api/admin/learning/process-signals`, {
      method: "POST",
      body,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to proxy process-signals request" },
      { status: 500 },
    );
  }
}
