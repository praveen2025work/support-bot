import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q") || "";
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const userName = request.nextUrl.searchParams.get("userName") || "";
    const userParam = userName
      ? `&userName=${encodeURIComponent(userName)}`
      : "";
    const engineRes = await proxyToEngine(
      `/api/queries/search?q=${encodeURIComponent(q)}&groupId=${encodeURIComponent(groupId)}${userParam}`,
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}

/**
 * Records that the user accepted a suggestion. Fire-and-forget from the
 * client; the response is informational only — no UI is gated on it.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const engineRes = await proxyToEngine(`/api/queries/search/pick`, {
      method: "POST",
      body,
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ recorded: false }, { status: 502 });
  }
}
