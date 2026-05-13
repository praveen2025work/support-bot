/**
 * GridBoard saved-view CRUD — per-group, version-checked.
 *
 * GridBoard's spreadsheet editor lets each user save their column
 * layout / pinning / filters / formats / formulas as a named "view".
 * Views are scoped to (groupId, queryName) and either:
 *   - private: only the owner sees them
 *   - public:  anyone in the same group sees them
 *
 * Storage: one JSON file per tenant at
 *   data/gridboard-views/<groupId>.json
 *
 * Concurrency: each view has a monotonic `version` counter. PUT accepts
 * an `If-Match: <version>` header; mismatched values get a 409 with
 * the current view so the client can resync without clobbering a
 * concurrent edit.
 *
 * Migration: a legacy global file at data/gridboard-views.json (from
 * before tenant scoping) gets transparently lifted into the default
 * tenant on first read.
 */

import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { paths, DATA_DIR } from "@/lib/env-config";
import { logger } from "@/lib/logger";

export const gridboardViewsRouter = Router();

interface GridBoardView {
  id: string;
  userId: string;
  groupId: string;
  queryName: string;
  viewName: string;
  visibility: "private" | "public";
  version: number;
  createdAt: string;
  updatedAt: string;
  /** Layout config (columnOrder, hiddenColumns, etc) — opaque to the engine. */
  [key: string]: unknown;
}

let migrationDone = false;

async function migrateLegacyIfNeeded(): Promise<void> {
  if (migrationDone) return;
  migrationDone = true;
  const legacyPath = join(DATA_DIR, "gridboard-views.json");
  try {
    const raw = await fs.readFile(legacyPath, "utf-8");
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    // Bucket by (groupId || "default"). Legacy entries lacked groupId.
    const buckets = new Map<string, GridBoardView[]>();
    for (const entry of parsed) {
      const groupId =
        typeof entry.groupId === "string" ? entry.groupId : "default";
      const lifted: GridBoardView = {
        ...(entry as GridBoardView),
        groupId,
        version: typeof entry.version === "number" ? entry.version : 1,
      };
      const arr = buckets.get(groupId) ?? [];
      arr.push(lifted);
      buckets.set(groupId, arr);
    }

    for (const [groupId, views] of buckets) {
      const targetPath = paths.data.gridboardViews(groupId);
      try {
        await fs.access(targetPath);
        // Existing per-group file — don't clobber it; assume migration
        // already happened or someone hand-curated it.
        continue;
      } catch {
        /* file doesn't exist; proceed */
      }
      await fs.mkdir(dirname(targetPath), { recursive: true });
      await fs.writeFile(
        targetPath,
        JSON.stringify(views, null, 2) + "\n",
        "utf-8",
      );
    }

    // Rename the legacy file so we don't migrate again on next boot.
    await fs.rename(legacyPath, legacyPath + ".migrated");
    logger.info(
      { groupCount: buckets.size, entryCount: parsed.length },
      "gridboard-views: migrated legacy global file into per-group buckets",
    );
  } catch {
    // No legacy file or unreadable — nothing to migrate.
  }
}

async function readAll(groupId: string): Promise<GridBoardView[]> {
  await migrateLegacyIfNeeded();
  const filePath = paths.data.gridboardViews(groupId);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(
  groupId: string,
  views: GridBoardView[],
): Promise<void> {
  const filePath = paths.data.gridboardViews(groupId);
  await fs.mkdir(dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(views, null, 2) + "\n", "utf-8");
}

function getUserId(req: Request): string | null {
  return (
    (typeof req.query.userId === "string" ? req.query.userId : null) ||
    (typeof req.body?.userId === "string" ? req.body.userId : null) ||
    null
  );
}

function getGroupId(req: Request): string {
  const fromQuery =
    typeof req.query.groupId === "string" ? req.query.groupId : null;
  const fromBody =
    typeof req.body?.groupId === "string" ? req.body.groupId : null;
  return fromQuery || fromBody || "default";
}

// GET /api/gridboard-views?userId=&queryName=&groupId=
gridboardViewsRouter.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const groupId = getGroupId(req);
    const queryName =
      typeof req.query.queryName === "string" ? req.query.queryName : undefined;
    const all = await readAll(groupId);
    const views = all.filter((v) => {
      if (queryName && v.queryName !== queryName) return false;
      return v.visibility === "public" || v.userId === userId;
    });
    return res.json({ views });
  } catch (err) {
    logger.error({ err, userId }, "gridboard-views: GET failed");
    return res.status(500).json({ error: "Failed to list grid board views" });
  }
});

// POST /api/gridboard-views — create
gridboardViewsRouter.post("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  const { queryName, viewName, visibility, ...rest } = req.body ?? {};
  if (!queryName)
    return res.status(400).json({ error: "queryName is required" });
  if (!viewName) return res.status(400).json({ error: "viewName is required" });
  try {
    const groupId = getGroupId(req);
    const now = new Date().toISOString();
    const view: GridBoardView = {
      ...(rest as Record<string, unknown>),
      id: randomUUID(),
      userId,
      groupId,
      queryName,
      viewName,
      visibility: visibility === "public" ? "public" : "private",
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    const all = await readAll(groupId);
    all.push(view);
    await writeAll(groupId, all);
    return res.status(201).json(view);
  } catch (err) {
    logger.error({ err, userId }, "gridboard-views: POST failed");
    return res.status(500).json({ error: "Failed to create grid board view" });
  }
});

// GET /api/gridboard-views/:id?userId=&groupId=
gridboardViewsRouter.get("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const groupId = getGroupId(req);
    const all = await readAll(groupId);
    const view = all.find((v) => v.id === req.params.id);
    if (!view) return res.status(404).json({ error: "View not found" });
    if (view.visibility !== "public" && view.userId !== userId) {
      return res.status(403).json({ error: "Not allowed" });
    }
    return res.json(view);
  } catch (err) {
    logger.error({ err, userId }, "gridboard-views: GET id failed");
    return res.status(500).json({ error: "Failed to read grid board view" });
  }
});

// PUT /api/gridboard-views/:id — update (optionally If-Match: <version>)
gridboardViewsRouter.put("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const groupId = getGroupId(req);
    const all = await readAll(groupId);
    const idx = all.findIndex((v) => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "View not found" });
    if (all[idx].userId !== userId) {
      return res.status(403).json({ error: "Only the owner can update" });
    }

    const ifMatch = req.header("If-Match") ?? req.header("if-match");
    if (ifMatch !== undefined && ifMatch !== "") {
      const expected = parseInt(ifMatch, 10);
      const current = all[idx].version ?? 0;
      if (Number.isFinite(expected) && expected !== current) {
        return res.status(409).json({
          error: "View was modified by another writer",
          currentVersion: current,
          providedVersion: expected,
          view: all[idx],
        });
      }
    }

    const { userId: _u, id: _id, ...partial } = req.body ?? {};
    void _u;
    void _id;
    const updated: GridBoardView = {
      ...all[idx],
      ...(partial as Record<string, unknown>),
      id: all[idx].id,
      userId: all[idx].userId,
      groupId: all[idx].groupId,
      queryName: all[idx].queryName,
      version: (all[idx].version ?? 0) + 1,
      createdAt: all[idx].createdAt,
      updatedAt: new Date().toISOString(),
    };
    all[idx] = updated;
    await writeAll(groupId, all);
    return res.json(updated);
  } catch (err) {
    logger.error({ err, userId }, "gridboard-views: PUT failed");
    return res.status(500).json({ error: "Failed to update grid board view" });
  }
});

// DELETE /api/gridboard-views/:id?userId=&groupId=
gridboardViewsRouter.delete("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const groupId = getGroupId(req);
    const all = await readAll(groupId);
    const idx = all.findIndex((v) => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "View not found" });
    if (all[idx].userId !== userId) {
      return res.status(403).json({ error: "Only the owner can delete" });
    }
    all.splice(idx, 1);
    await writeAll(groupId, all);
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, userId }, "gridboard-views: DELETE failed");
    return res.status(500).json({ error: "Failed to delete grid board view" });
  }
});
