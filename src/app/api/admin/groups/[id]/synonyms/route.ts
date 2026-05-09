import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

// Note: per-group synonyms are mounted under /api/admin/groups/:groupId/synonyms
// on the engine. The engine route uses Express path params (req.params.groupId),
// so the proxy URL must include the encoded groupId.

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const { id } = await Promise.resolve(params);
    const engineRes = await proxyToEngine(
      `/api/admin/groups/${encodeURIComponent(id)}/synonyms`,
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin GET group synonyms — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const { id } = await Promise.resolve(params);
    const body = await request.json();
    const engineRes = await proxyToEngine(
      `/api/admin/groups/${encodeURIComponent(id)}/synonyms`,
      { method: "POST", body },
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin POST group synonyms — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const { id } = await Promise.resolve(params);
    const url = new URL(request.url);
    const canonical = url.searchParams.get("canonical");
    if (!canonical) {
      return NextResponse.json(
        { error: "canonical query param is required" },
        { status: 400 },
      );
    }
    const engineRes = await proxyToEngine(
      `/api/admin/groups/${encodeURIComponent(id)}/synonyms?canonical=${encodeURIComponent(canonical)}`,
      { method: "DELETE" },
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin DELETE group synonym — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}
