import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:4001";

/**
 * POST /api/write
 *
 * Proxy write-back requests to the engine, which forwards to the appropriate connector.
 * Body: { queryName, groupId, changes: [{ primaryKey: {...}, updates: {...} }] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryName, groupId, changes } = body;

    if (!queryName || !changes || !Array.isArray(changes)) {
      return NextResponse.json(
        { error: "queryName and changes array are required" },
        { status: 400 },
      );
    }

    logger.info(
      { queryName, groupId, changeCount: changes.length },
      "Write-back request",
    );

    // Forward to engine
    const engineRes = await fetch(`${ENGINE_URL}/api/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queryName, groupId, changes }),
    });

    if (!engineRes.ok) {
      const errText = await engineRes.text();
      logger.error(
        { status: engineRes.status, body: errText },
        "Engine write-back failed",
      );
      return NextResponse.json(
        { error: `Write-back failed: ${errText}` },
        { status: engineRes.status },
      );
    }

    const result = await engineRes.json();
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, "Write-back proxy error");
    return NextResponse.json(
      { error: "Failed to process write-back request" },
      { status: 500 },
    );
  }
}
