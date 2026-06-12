import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

// POST /api/admin/groups/:id/synonyms/score — diagnostic NLP scoring for the
// synonym editor test box. Forwards to the engine's per-group synonyms router.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const { id } = await Promise.resolve(params);
    const body = await request.json();
    const engineRes = await proxyToEngine(
      `/api/admin/groups/${encodeURIComponent(id)}/synonyms/score`,
      { method: "POST", body },
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin POST synonym score — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}
