import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

/**
 * Thin proxy to the engine. The engine is the source of truth for
 * GridBoard views — it scopes per (groupId, queryName, userId) and
 * enforces optimistic concurrency via the `version` counter.
 */
export async function GET(request: NextRequest) {
  try {
    const qs = request.nextUrl.search;
    const engineRes = await proxyToEngine(`/api/gridboard-views${qs}`);
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ error: "Engine unavailable" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const engineRes = await proxyToEngine(`/api/gridboard-views`, {
      method: "POST",
      body,
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ error: "Engine unavailable" }, { status: 502 });
  }
}
