import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

/**
 * Thin proxy to the engine. The engine enforces ownership + optimistic
 * concurrency. The If-Match header is forwarded so the engine can
 * surface 409 when another writer beat us.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ viewId: string }> },
) {
  try {
    const { viewId } = await params;
    const body = await request.json();
    const ifMatch = request.headers.get("If-Match");
    const engineRes = await proxyToEngine(
      `/api/gridboard-views/${encodeURIComponent(viewId)}`,
      {
        method: "PUT",
        body,
        headers: ifMatch ? { "If-Match": ifMatch } : undefined,
      },
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ error: "Engine unavailable" }, { status: 502 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ viewId: string }> },
) {
  try {
    const { viewId } = await params;
    const qs = request.nextUrl.search;
    const engineRes = await proxyToEngine(
      `/api/gridboard-views/${encodeURIComponent(viewId)}${qs}`,
      { method: "DELETE" },
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ error: "Engine unavailable" }, { status: 502 });
  }
}
