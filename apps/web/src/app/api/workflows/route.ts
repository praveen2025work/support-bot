import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const userId = request.nextUrl.searchParams.get("userId");
    const qs = userId
      ? `?groupId=${encodeURIComponent(groupId)}&userId=${encodeURIComponent(userId)}`
      : `?groupId=${encodeURIComponent(groupId)}`;
    const engineRes = await proxyToEngine(`/api/workflows${qs}`);
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { success: false, data: [], error: "Failed to reach engine" },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const engineRes = await proxyToEngine("/api/workflows", {
      method: "POST",
      body,
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to reach engine" },
      { status: 502 },
    );
  }
}
