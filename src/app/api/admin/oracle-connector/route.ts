import { NextRequest, NextResponse } from "next/server";
import { proxyToConnector } from "@/lib/connector-proxy";
import { logger } from "@/lib/logger";

// GET: List connectors OR get single connector details/schemas/tables/columns/procedures
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      const response = await proxyToConnector("oracle", "/api/connectors");
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const resource = request.nextUrl.searchParams.get("resource");
    const schema = request.nextUrl.searchParams.get("schema") || "";
    const table = request.nextUrl.searchParams.get("table");

    let path = `/api/connectors/${id}`;
    if (resource === "schemas") path += "/schemas";
    else if (resource === "tables")
      path += `/tables?schema=${encodeURIComponent(schema)}`;
    else if (resource === "columns")
      path += `/columns?schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(table || "")}`;
    else if (resource === "procedures")
      path += `/procedures?schema=${encodeURIComponent(schema)}`;

    const response = await proxyToConnector("oracle", path);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    logger.error({ error }, "Failed to proxy GET /oracle-connector");
    return NextResponse.json(
      { error: "Failed to fetch Oracle connectors" },
      { status: 500 },
    );
  }
}

// POST: Create connector, test connection, or preview query
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const connectorId = body.id;

    if (!connectorId || (!body.action && body.name)) {
      const response = await proxyToConnector("oracle", "/api/connectors", {
        method: "POST",
        body,
      });
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const action = body.action || "test";
    let path: string;
    let postBody: unknown;

    if (action === "preview") {
      path = `/api/connectors/${connectorId}/preview`;
      postBody = { sql: body.sql, params: body.params, maxRows: body.maxRows };
    } else {
      path = `/api/connectors/${connectorId}/test`;
      postBody = {};
    }

    const response = await proxyToConnector("oracle", path, {
      method: "POST",
      body: postBody,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    logger.error({ error }, "Failed to proxy POST /oracle-connector");
    return NextResponse.json(
      { error: "Failed to execute action" },
      { status: 500 },
    );
  }
}

// PUT: Update connector
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id;
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const response = await proxyToConnector("oracle", `/api/connectors/${id}`, {
      method: "PUT",
      body,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    logger.error({ error }, "Failed to proxy PUT /oracle-connector");
    return NextResponse.json(
      { error: "Failed to update connector" },
      { status: 500 },
    );
  }
}

// DELETE: Delete connector
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "id query param is required" },
        { status: 400 },
      );

    const response = await proxyToConnector("oracle", `/api/connectors/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    logger.error({ error }, "Failed to proxy DELETE /oracle-connector");
    return NextResponse.json(
      { error: "Failed to delete connector" },
      { status: 500 },
    );
  }
}
