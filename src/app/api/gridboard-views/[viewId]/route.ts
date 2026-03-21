import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
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
 * PUT /api/gridboard-views/[viewId]
 * Update an existing view. Only the owner can update.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ viewId: string }> },
) {
  try {
    const { viewId } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const all = readAllViews();
    const idx = all.findIndex((v) => v.id === viewId);

    if (idx === -1) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    if (all[idx].userId !== userId) {
      return NextResponse.json(
        { error: "Only the view owner can update it" },
        { status: 403 },
      );
    }

    const updated: GridBoardView = {
      ...all[idx],
      ...body,
      id: viewId,
      userId: all[idx].userId,
      queryName: all[idx].queryName,
      updatedAt: new Date().toISOString(),
    };

    all[idx] = updated;
    writeAllViews(all);

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * DELETE /api/gridboard-views/[viewId]?userId=X
 * Delete a view. Only the owner can delete.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ viewId: string }> },
) {
  try {
    const { viewId } = await params;
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const all = readAllViews();
    const idx = all.findIndex((v) => v.id === viewId);

    if (idx === -1) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    if (all[idx].userId !== userId) {
      return NextResponse.json(
        { error: "Only the view owner can delete it" },
        { status: 403 },
      );
    }

    all.splice(idx, 1);
    writeAllViews(all);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
