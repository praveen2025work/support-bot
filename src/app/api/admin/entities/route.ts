import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

// GET — list all entities
export async function GET() {
  try {
    const engineRes = await proxyToEngine("/api/admin/entities");
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin GET entities — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}

// POST — add/update an entity option (e.g., add synonyms for a query_name)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const engineRes = await proxyToEngine("/api/admin/entities", {
      method: "POST",
      body,
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin POST entities — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}

// DELETE — remove an entity option
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const optionKey = searchParams.get("optionKey");

    if (!entityType || !optionKey) {
      return NextResponse.json(
        { error: "entityType and optionKey query params are required" },
        { status: 400 },
      );
    }

    const engineRes = await proxyToEngine(
      `/api/admin/entities?entityType=${encodeURIComponent(entityType)}&optionKey=${encodeURIComponent(optionKey)}`,
      { method: "DELETE" },
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin DELETE entity — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}
