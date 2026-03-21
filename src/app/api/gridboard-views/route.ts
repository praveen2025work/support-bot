import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import type { GridBoardView } from "@/types/dashboard";

const VIEWS_PATH = join(
  process.cwd(),
  "services/engine/data/gridboard-views.json",
);

function readAllViews(): GridBoardView[] {
  if (!existsSync(VIEWS_PATH)) return [];
  try {
    const raw = JSON.parse(readFileSync(VIEWS_PATH, "utf-8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeAllViews(views: GridBoardView[]) {
  writeFileSync(VIEWS_PATH, JSON.stringify(views, null, 2) + "\n", "utf-8");
}

/**
 * GET /api/gridboard-views?userId=X&queryName=Y
 * Returns user's private views + all public views for the query.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get("userId");
  const queryName = searchParams.get("queryName");

  if (!userId || !queryName) {
    return NextResponse.json(
      { error: "userId and queryName are required" },
      { status: 400 },
    );
  }

  const all = readAllViews();
  const views = all.filter(
    (v) =>
      v.queryName === queryName &&
      (v.visibility === "public" || v.userId === userId),
  );

  return NextResponse.json({ views });
}

/**
 * POST /api/gridboard-views
 * Create a new view. Returns the created view with generated id.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, queryName, viewName } = body;

    if (!userId || !queryName || !viewName) {
      return NextResponse.json(
        { error: "userId, queryName, and viewName are required" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const view: GridBoardView = {
      id: randomUUID(),
      userId,
      queryName,
      viewName,
      visibility: body.visibility || "private",
      columnOrder: body.columnOrder || [],
      hiddenColumns: body.hiddenColumns || [],
      columnWidths: body.columnWidths || {},
      pinnedColumns: body.pinnedColumns || [],
      sortConfig: body.sortConfig || [],
      groupByColumn: body.groupByColumn,
      clientFilters: body.clientFilters || {},
      pageSize: body.pageSize || 25,
      conditionalFormats: body.conditionalFormats || [],
      formulaColumns: body.formulaColumns,
      sparklineColumns: body.sparklineColumns,
      columnAggregations: body.columnAggregations,
      validationRules: body.validationRules,
      frozenRowIndices: body.frozenRowIndices,
      createdAt: now,
      updatedAt: now,
    };

    const all = readAllViews();
    all.push(view);
    writeAllViews(all);

    return NextResponse.json(view, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
