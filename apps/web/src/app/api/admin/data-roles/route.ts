import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

// Data roles are owned by the engine registry (CONFIG_DIR/data-roles.json),
// which is the single writer and logs every mutation to the audit trail.
// These routes proxy through so the admin UI exercises that path.

export async function GET() {
  try {
    const engineRes = await proxyToEngine("/api/admin/data-roles");
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin GET data-roles — engine unreachable");
    return NextResponse.json({ roles: [] }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const engineRes = await proxyToEngine("/api/admin/data-roles", {
      method: "POST",
      body,
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin POST data-roles — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}
