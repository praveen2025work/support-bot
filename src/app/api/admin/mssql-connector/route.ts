import { NextRequest, NextResponse } from "next/server";
import { proxyToConnector } from "@/lib/connector-proxy";
import { logger } from "@/lib/logger";

// GET: List connectors OR get single connector details/schemas/tables/columns/procedures
//   ?id=xxx                    → get connector details
//   ?id=xxx&resource=schemas   → get schemas
//   ?id=xxx&resource=tables&schema=dbo → get tables
//   ?id=xxx&resource=columns&schema=dbo&table=Users → get columns
//   ?id=xxx&resource=procedures&schema=dbo → get procedures
//   (no params)                → list all connectors
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      // List all connectors
      const response = await proxyToConnector("mssql", "/api/connectors");
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    // Single connector operations
    const resource = request.nextUrl.searchParams.get("resource");
    const schema = request.nextUrl.searchParams.get("schema") || "dbo";
    const table = request.nextUrl.searchParams.get("table");

    let path = `/api/connectors/${id}`;
    if (resource === "schemas") path += "/schemas";
    else if (resource === "tables")
      path += `/tables?schema=${encodeURIComponent(schema)}`;
    else if (resource === "columns")
      path += `/columns?schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(table || "")}`;
    else if (resource === "procedures")
      path += `/procedures?schema=${encodeURIComponent(schema)}`;

    const response = await proxyToConnector("mssql", path);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    logger.error({ error }, "Failed to proxy GET /mssql-connector");
    return NextResponse.json(
      { error: "Failed to fetch MSSQL connectors" },
      { status: 500 },
    );
  }
}

// POST: Create connector, test connection, or preview query
//   body.id absent    → create new connector
//   body.id + action=test    → test connection
//   body.id + action=preview → preview SQL query
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const connectorId = body.id;

    if (!connectorId || (!body.action && body.name)) {
      // Create new connector
      const response = await proxyToConnector("mssql", "/api/connectors", {
        method: "POST",
        body,
      });
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    // Connector-specific action
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

    const response = await proxyToConnector("mssql", path, {
      method: "POST",
      body: postBody,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    logger.error({ error }, "Failed to proxy POST /mssql-connector");
    return NextResponse.json(
      { error: "Failed to execute action" },
      { status: 500 },
    );
  }
}

// PUT: Update connector — body must include id
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id;
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const response = await proxyToConnector("mssql", `/api/connectors/${id}`, {
      method: "PUT",
      body,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    logger.error({ error }, "Failed to proxy PUT /mssql-connector");
    return NextResponse.json(
      { error: "Failed to update connector" },
      { status: 500 },
    );
  }
}

// DELETE: Delete connector — ?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "id query param is required" },
        { status: 400 },
      );

    const response = await proxyToConnector("mssql", `/api/connectors/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    logger.error({ error }, "Failed to proxy DELETE /mssql-connector");
    return NextResponse.json(
      { error: "Failed to delete connector" },
      { status: 500 },
    );
  }
}
