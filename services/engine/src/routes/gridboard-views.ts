import { Router, Request, Response } from "express";
import { preferencesStore } from "@/data/user-preferences";
import { logger } from "@/lib/logger";

export const gridboardViewsRouter = Router();

function getUserId(req: Request): string | null {
  return (req.query.userId as string) || (req.body?.userId as string) || null;
}

// GET /api/gridboard-views?userId=&queryName= — list views (optional queryName filter)
gridboardViewsRouter.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const queryName = req.query.queryName as string | undefined;
    const views = await preferencesStore.listGridBoardViews(userId, queryName);
    return res.json({ views });
  } catch (err) {
    logger.error({ err, userId }, "Failed to list grid board views");
    return res.status(500).json({ error: "Failed to list grid board views" });
  }
});

// POST /api/gridboard-views — create view
gridboardViewsRouter.post("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  const { queryName, viewName, ...rest } = req.body;
  if (!queryName)
    return res.status(400).json({ error: "queryName is required" });
  if (!viewName) return res.status(400).json({ error: "viewName is required" });
  try {
    const view = await preferencesStore.createGridBoardView(userId, {
      queryName,
      viewName,
      columnOrder: rest.columnOrder || [],
      hiddenColumns: rest.hiddenColumns || [],
      columnWidths: rest.columnWidths || {},
      pinnedColumns: rest.pinnedColumns || [],
      sortConfig: rest.sortConfig || [],
      groupByColumn: rest.groupByColumn,
      clientFilters: rest.clientFilters || {},
      pageSize: rest.pageSize || 25,
      conditionalFormats: rest.conditionalFormats || [],
    });
    return res.status(201).json(view);
  } catch (err) {
    logger.error({ err, userId }, "Failed to create grid board view");
    return res.status(500).json({ error: "Failed to create grid board view" });
  }
});

// GET /api/gridboard-views/:id?userId= — get single view
gridboardViewsRouter.get("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const view = await preferencesStore.getGridBoardView(userId, req.params.id);
    if (!view) return res.status(404).json({ error: "View not found" });
    return res.json(view);
  } catch (err) {
    logger.error({ err, userId }, "Failed to get grid board view");
    return res.status(500).json({ error: "Failed to get grid board view" });
  }
});

// PUT /api/gridboard-views/:id — update view
gridboardViewsRouter.put("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const { userId: _u, ...partial } = req.body;
    const view = await preferencesStore.updateGridBoardView(
      userId,
      req.params.id,
      partial,
    );
    if (!view) return res.status(404).json({ error: "View not found" });
    return res.json(view);
  } catch (err) {
    logger.error({ err, userId }, "Failed to update grid board view");
    return res.status(500).json({ error: "Failed to update grid board view" });
  }
});

// DELETE /api/gridboard-views/:id?userId= — delete view
gridboardViewsRouter.delete("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const deleted = await preferencesStore.deleteGridBoardView(
      userId,
      req.params.id,
    );
    if (!deleted) return res.status(404).json({ error: "View not found" });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, userId }, "Failed to delete grid board view");
    return res.status(500).json({ error: "Failed to delete grid board view" });
  }
});
