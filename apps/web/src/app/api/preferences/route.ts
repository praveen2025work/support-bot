import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }
    const engineRes = await proxyToEngine(
      `/api/preferences?userId=${encodeURIComponent(userId)}`,
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach engine" },
      { status: 502 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }
    const body = await request.json();
    const engineRes = await proxyToEngine(
      `/api/preferences?userId=${encodeURIComponent(userId)}`,
      { method: "PUT", body },
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach engine" },
      { status: 502 },
    );
  }
}
