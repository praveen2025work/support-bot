import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { logger } from "@/lib/logger";
import { proxyToEngine } from "@/lib/engine-proxy";

/**
 * Admin query CRUD — a thin proxy to the engine, which owns the file-based
 * per-group query store (DATA_DIR/queries/<group>.json). No db.json here: the
 * mock-api fixture is data-only, so this works identically in every
 * environment. Every request is group-scoped via `groupId`.
 */

/** Sanitize a sheet name to a valid query name suffix (snake_case). */
function toSnakeCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Best-effort xlsx sheet-name read for multi-sheet auto-registration. Returns
 * [] when the file can't be read (e.g. the UI runs in a container without the
 * data files) — callers then fall back to a single query.
 */
async function getXlsxSheetNames(
  filePath: string,
  queryFileBaseDir?: string,
): Promise<string[]> {
  const ext = path.extname(filePath || "").toLowerCase();
  if (ext !== ".xlsx" && ext !== ".xls") return [];
  try {
    const externalBase = queryFileBaseDir || process.env.FILE_BASE_DIR || "";
    const baseDir =
      externalBase || path.resolve(process.cwd(), "services/engine");
    const resolved = path.resolve(baseDir, filePath);
    const buffer = await fs.readFile(resolved);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require("xlsx");
    const wb = XLSX.read(buffer, { type: "buffer" });
    return wb.SheetNames as string[];
  } catch {
    return [];
  }
}

/** Parse an engine Response body as JSON, tolerating empty bodies. */
async function engineJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// GET: list a group's queries (proxied; engine returns them group-scoped)
export async function GET(request: NextRequest) {
  try {
    const qs = request.nextUrl.searchParams.toString();
    const res = await proxyToEngine(`/api/admin/queries${qs ? `?${qs}` : ""}`);
    const data = await engineJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    logger.error({ error }, "Failed to read queries — engine unreachable");
    return NextResponse.json({ queries: [] }, { status: 502 });
  }
}

// POST: create a query in a group (expands multi-sheet xlsx into N queries)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const groupId = body.groupId;
    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 },
      );
    }
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const queryType = body.type || "api";
    const sheetNames =
      queryType === "csv" || queryType === "xlsx"
        ? await getXlsxSheetNames(body.filePath, body.fileBaseDir)
        : [];
    const isMultiSheet = sheetNames.length > 1;

    const payloads = isMultiSheet
      ? sheetNames.map((sheet) => ({
          ...body,
          name: `${body.name}_${toSnakeCase(sheet)}`,
          sheetName: sheet,
          description: `${body.description || body.name} — sheet "${sheet}"`,
        }))
      : [body];

    const created: unknown[] = [];
    for (const payload of payloads) {
      const res = await proxyToEngine("/api/admin/queries", {
        method: "POST",
        body: { ...payload, groupId },
      });
      const data = await engineJson(res);
      if (!res.ok) {
        return NextResponse.json(data, { status: res.status });
      }
      created.push(data);
    }

    return NextResponse.json(
      isMultiSheet
        ? { queries: created, sheetsRegistered: created.length }
        : created[0],
      { status: 201 },
    );
  } catch (error) {
    logger.error({ error }, "Failed to create query");
    return NextResponse.json(
      { error: "Failed to create query" },
      { status: 500 },
    );
  }
}

// PATCH: update a query by id within a group (proxied)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (!body.groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 },
      );
    }
    const res = await proxyToEngine("/api/admin/queries", {
      method: "PATCH",
      body,
    });
    const data = await engineJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    logger.error({ error }, "Failed to update query");
    return NextResponse.json(
      { error: "Failed to update query" },
      { status: 500 },
    );
  }
}

// DELETE: remove a query by id within a group (proxied)
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    const groupId = request.nextUrl.searchParams.get("groupId");
    if (!id) {
      return NextResponse.json(
        { error: "id query param is required" },
        { status: 400 },
      );
    }
    if (!groupId) {
      return NextResponse.json(
        { error: "groupId query param is required" },
        { status: 400 },
      );
    }
    const res = await proxyToEngine(
      `/api/admin/queries?id=${encodeURIComponent(id)}&groupId=${encodeURIComponent(groupId)}`,
      { method: "DELETE" },
    );
    const data = await engineJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    logger.error({ error }, "Failed to delete query");
    return NextResponse.json(
      { error: "Failed to delete query" },
      { status: 500 },
    );
  }
}
