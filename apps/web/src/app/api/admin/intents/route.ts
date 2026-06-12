import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

// GET — list all intents with their training phrases and entity info
export async function GET() {
  try {
    const engineRes = await proxyToEngine("/api/admin/intents");
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin GET intents — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}

// POST — add a new intent or update an existing one
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const engineRes = await proxyToEngine("/api/admin/intents", {
      method: "POST",
      body,
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin POST intents — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}

// DELETE — remove an intent
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const intent = searchParams.get("intent");

    if (!intent) {
      return NextResponse.json(
        { error: "intent query param is required" },
        { status: 400 },
      );
    }

    const engineRes = await proxyToEngine(
      `/api/admin/intents?intent=${encodeURIComponent(intent)}`,
      { method: "DELETE" },
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, "Admin DELETE intent — engine unreachable");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}
