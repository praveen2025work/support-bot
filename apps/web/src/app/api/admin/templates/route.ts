import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

// GET — list base templates and per-group template overrides
export async function GET() {
  try {
    const engineRes = await proxyToEngine("/api/admin/templates");
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin GET templates — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}

// POST — update a template (base or group-specific)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const engineRes = await proxyToEngine("/api/admin/templates", {
      method: "POST",
      body,
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin POST templates — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}

// DELETE — remove a template entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "base";
    const intent = searchParams.get("intent");

    if (!intent) {
      return NextResponse.json(
        { error: "intent query param is required" },
        { status: 400 },
      );
    }

    const engineRes = await proxyToEngine(
      `/api/admin/templates?scope=${encodeURIComponent(scope)}&intent=${encodeURIComponent(intent)}`,
      { method: "DELETE" },
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin DELETE template — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}
