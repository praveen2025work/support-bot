import { NextRequest, NextResponse } from "next/server";
import { proxyToConnector } from "@/lib/connector-proxy";
import { logger } from "@/lib/logger";

// GET: List saved queries in MSSQL connector
export async function GET(request: NextRequest) {
  try {
    const connectorId = request.nextUrl.searchParams.get("connectorId") || "";
    const path = connectorId
      ? `/api/queries?connectorId=${encodeURIComponent(connectorId)}`
      : "/api/queries";
    const response = await proxyToConnector("mssql", path);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    logger.error({ error }, "Failed to proxy GET /mssql-connector/queries");
    return NextResponse.json(
      { error: "Failed to fetch queries" },
      { status: 500 },
    );
  }
}

// POST: Create a saved query in MSSQL connector
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await proxyToConnector("mssql", "/api/queries", {
      method: "POST",
      body,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    logger.error({ error }, "Failed to proxy POST /mssql-connector/queries");
    return NextResponse.json(
      { error: "Failed to create query" },
      { status: 500 },
    );
  }
}

// DELETE: Delete a saved query from MSSQL connector
export async function DELETE(request: NextRequest) {
  try {
    const queryId = request.nextUrl.searchParams.get("id");
    if (!queryId) {
      return NextResponse.json({ error: "Missing query id" }, { status: 400 });
    }
    const response = await proxyToConnector(
      "mssql",
      `/api/queries/${encodeURIComponent(queryId)}`,
      { method: "DELETE" },
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    logger.error({ error }, "Failed to proxy DELETE /mssql-connector/queries");
    return NextResponse.json(
      { error: "Failed to delete query" },
      { status: 500 },
    );
  }
}
