import { Router, Request, Response } from "express";
import { preferencesStore } from "@/data/user-preferences";
import { logger } from "@/lib/logger";
export const dashboardsRouter = Router();

function getUserId(req: Request): string | null {
  return (req.query.userId as string) || (req.body?.userId as string) || null;
}

/**
 * Check if the requesting user has access to a dashboard.
 * Returns the permission level or sends an error response.
 */
async function checkDashboardAccess(
  userId: string,
  dashboardId: string,
  requiredPermission: "view" | "edit" | "owner",
  res: Response,
): Promise<"owner" | "edit" | "view" | false> {
  const result = await preferencesStore.findDashboardAcrossUsers(
    userId,
    dashboardId,
  );
  if (!result) {
    res.status(404).json({ error: "Dashboard not found" });
    return false;
  }
  if (result.permission === null) {
    res
      .status(403)
      .json({ error: "Access denied — this dashboard is private" });
    return false;
  }
  const hierarchy = { owner: 3, edit: 2, view: 1 };
  if (hierarchy[result.permission] < hierarchy[requiredPermission]) {
    res
      .status(403)
      .json({
        error: `Access denied — requires ${requiredPermission} permission`,
      });
    return false;
  }
  return result.permission;
}

// GET /api/dashboards?userId= — list all dashboards
dashboardsRouter.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const dashboards = await preferencesStore.listDashboards(userId);
    const prefs = await preferencesStore.read(userId);
    return res.json({ dashboards, activeDashboardId: prefs.activeDashboardId });
  } catch (err) {
    logger.error({ err, userId }, "Failed to list dashboards");
    return res.status(500).json({ error: "Failed to list dashboards" });
  }
});

// POST /api/dashboards — create dashboard
dashboardsRouter.post("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const dashboard = await preferencesStore.createDashboard(userId, { name });
    return res.status(201).json(dashboard);
  } catch (err) {
    logger.error({ err, userId }, "Failed to create dashboard");
    return res.status(500).json({ error: "Failed to create dashboard" });
  }
});

// PUT /api/dashboards/active — persist active dashboard selection
// IMPORTANT: Must be defined BEFORE /:id routes to avoid Express matching "active" as :id
dashboardsRouter.put("/active", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  const { dashboardId } = req.body;
  if (!dashboardId)
    return res.status(400).json({ error: "dashboardId is required" });
  try {
    await preferencesStore.setActiveDashboard(userId, dashboardId);
    return res.json({ success: true, activeDashboardId: dashboardId });
  } catch (err) {
    logger.error({ err, userId }, "Failed to set active dashboard");
    return res.status(500).json({ error: "Failed to set active dashboard" });
  }
});

// GET /api/dashboards/templates — list available templates
// IMPORTANT: Must be defined BEFORE /:id routes to avoid Express matching "templates" as :id
dashboardsRouter.get("/templates", async (_req: Request, res: Response) => {
  try {
    const templates = getDashboardTemplates();
    return res.json({ templates });
  } catch (err) {
    logger.error({ err }, "Failed to list templates");
    return res.status(500).json({ error: "Failed to list templates" });
  }
});

// GET /api/dashboards/shared?userId= — get dashboards shared with user
// IMPORTANT: Must be defined BEFORE /:id routes to avoid Express matching "shared" as :id
dashboardsRouter.get("/shared", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const shared = await preferencesStore.getSharedDashboards(userId);
    return res.json({ dashboards: shared });
  } catch (err) {
    logger.error({ err, userId }, "Failed to get shared dashboards");
    return res.status(500).json({ error: "Failed to get shared dashboards" });
  }
});

// POST /api/dashboards/from-template/:templateId — create dashboard from template
dashboardsRouter.post(
  "/from-template/:templateId",
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "userId is required" });
    try {
      const template = getDashboardTemplates().find(
        (t) => t.id === req.params.templateId,
      );
      if (!template)
        return res.status(404).json({ error: "Template not found" });
      const dashboard = await preferencesStore.createDashboard(userId, {
        name: template.name,
        cards:
          template.cards as import("@/data/user-preferences").DashboardCard[],
        layouts: template.layouts,
      });
      return res.status(201).json(dashboard);
    } catch (err) {
      logger.error({ err, userId }, "Failed to create from template");
      return res.status(500).json({ error: "Failed to create from template" });
    }
  },
);

// GET /api/dashboards/:id?userId= — get single dashboard (with access control)
// IMPORTANT: Must be AFTER all named routes (/shared, /templates, /active) to avoid matching them as :id
dashboardsRouter.get("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const result = await preferencesStore.findDashboardAcrossUsers(
      userId,
      req.params.id,
    );
    if (!result) return res.status(404).json({ error: "Dashboard not found" });
    if (result.permission === null) {
      return res
        .status(403)
        .json({ error: "Access denied — this dashboard is private" });
    }
    return res.json({
      ...result.dashboard,
      _permission: result.permission,
      _ownerId: result.ownerId,
    });
  } catch (err) {
    logger.error({ err, userId }, "Failed to get dashboard");
    return res.status(500).json({ error: "Failed to get dashboard" });
  }
});

// PUT /api/dashboards/:id — update dashboard (owner only)
dashboardsRouter.put("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const permission = await checkDashboardAccess(
      userId,
      req.params.id,
      "owner",
      res,
    );
    if (!permission) return;
    const {
      name,
      cards,
      layouts,
      simpleMode,
      globalRefreshSec,
      tabs,
      activeTabId,
      sharing,
      filterDependencies,
      stompEnabled,
      parameters,
      kpiCards,
    } = req.body;
    const dashboard = await preferencesStore.updateDashboard(
      userId,
      req.params.id,
      {
        name,
        cards,
        layouts,
        simpleMode,
        globalRefreshSec,
        tabs,
        activeTabId,
        sharing,
        filterDependencies,
        stompEnabled,
        parameters,
        kpiCards,
      },
    );
    if (!dashboard)
      return res.status(404).json({ error: "Dashboard not found" });
    return res.json(dashboard);
  } catch (err) {
    logger.error({ err, userId }, "Failed to update dashboard");
    return res.status(500).json({ error: "Failed to update dashboard" });
  }
});

// DELETE /api/dashboards/:id?userId= — delete dashboard (owner only)
dashboardsRouter.delete("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const permission = await checkDashboardAccess(
      userId,
      req.params.id,
      "owner",
      res,
    );
    if (!permission) return;
    const deleted = await preferencesStore.deleteDashboard(
      userId,
      req.params.id,
    );
    if (!deleted) return res.status(404).json({ error: "Dashboard not found" });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, userId }, "Failed to delete dashboard");
    return res.status(500).json({ error: "Failed to delete dashboard" });
  }
});

// PUT /api/dashboards/:id/layouts — save layout positions (drag/drop)
dashboardsRouter.put("/:id/layouts", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const { layouts } = req.body;
    if (!Array.isArray(layouts))
      return res.status(400).json({ error: "layouts array is required" });
    const dashboard = await preferencesStore.updateDashboardLayouts(
      userId,
      req.params.id,
      layouts,
    );
    if (!dashboard)
      return res.status(404).json({ error: "Dashboard not found" });
    return res.json(dashboard);
  } catch (err) {
    logger.error({ err, userId }, "Failed to update layouts");
    return res.status(500).json({ error: "Failed to update layouts" });
  }
});

// POST /api/dashboards/:id/cards — add card
dashboardsRouter.post("/:id/cards", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const {
      queryName,
      groupId,
      label,
      defaultFilters,
      autoRun,
      eventLink,
      displayMode,
      stompEnabled,
    } = req.body;
    if (!queryName || !groupId)
      return res
        .status(400)
        .json({ error: "queryName and groupId are required" });
    const card = await preferencesStore.addCardToDashboard(
      userId,
      req.params.id,
      {
        queryName,
        groupId,
        label: label || queryName,
        defaultFilters: defaultFilters || {},
        autoRun: autoRun ?? true,
        eventLink: eventLink || { mode: "auto" },
        ...(displayMode && { displayMode }),
        ...(stompEnabled != null && { stompEnabled }),
      },
    );
    if (!card) return res.status(404).json({ error: "Dashboard not found" });
    return res.status(201).json(card);
  } catch (err) {
    logger.error({ err, userId }, "Failed to add card");
    return res.status(500).json({ error: "Failed to add card" });
  }
});

// PUT /api/dashboards/:id/cards/:cardId — update card config
dashboardsRouter.put(
  "/:id/cards/:cardId",
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "userId is required" });
    try {
      const card = await preferencesStore.updateCard(
        userId,
        req.params.id,
        req.params.cardId,
        req.body,
      );
      if (!card) return res.status(404).json({ error: "Card not found" });
      return res.json(card);
    } catch (err) {
      logger.error({ err, userId }, "Failed to update card");
      return res.status(500).json({ error: "Failed to update card" });
    }
  },
);

// DELETE /api/dashboards/:id/cards/:cardId — remove card
dashboardsRouter.delete(
  "/:id/cards/:cardId",
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "userId is required" });
    try {
      const deleted = await preferencesStore.removeCardFromDashboard(
        userId,
        req.params.id,
        req.params.cardId,
      );
      if (!deleted) return res.status(404).json({ error: "Card not found" });
      return res.json({ success: true });
    } catch (err) {
      logger.error({ err, userId }, "Failed to remove card");
      return res.status(500).json({ error: "Failed to remove card" });
    }
  },
);

// POST /api/dashboards/:id/migrate-favorites — import favorites as cards
dashboardsRouter.post(
  "/:id/migrate-favorites",
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "userId is required" });
    try {
      const dashboard = await preferencesStore.migrateFavoritesToDashboard(
        userId,
        req.params.id,
      );
      if (!dashboard)
        return res.status(404).json({ error: "Dashboard not found" });
      return res.json(dashboard);
    } catch (err) {
      logger.error({ err, userId }, "Failed to migrate favorites");
      return res.status(500).json({ error: "Failed to migrate favorites" });
    }
  },
);

// GET /api/dashboards/:id/export — export dashboard as JSON
dashboardsRouter.get("/:id/export", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const dashboard = await preferencesStore.exportDashboard(
      userId,
      req.params.id,
    );
    if (!dashboard)
      return res.status(404).json({ error: "Dashboard not found" });
    return res.json(dashboard);
  } catch (err) {
    logger.error({ err, userId }, "Failed to export dashboard");
    return res.status(500).json({ error: "Failed to export dashboard" });
  }
});

// POST /api/dashboards/import — import dashboard from JSON
dashboardsRouter.post("/import", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const { dashboard: dashboardData } = req.body;
    if (!dashboardData || !dashboardData.name)
      return res
        .status(400)
        .json({ error: "dashboard object with name is required" });
    const dashboard = await preferencesStore.importDashboard(
      userId,
      dashboardData,
    );
    return res.status(201).json(dashboard);
  } catch (err) {
    logger.error({ err, userId }, "Failed to import dashboard");
    return res.status(500).json({ error: "Failed to import dashboard" });
  }
});

// PUT /api/dashboards/:id/sharing — update sharing configuration (owner only)
dashboardsRouter.put("/:id/sharing", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const permission = await checkDashboardAccess(
      userId,
      req.params.id,
      "owner",
      res,
    );
    if (!permission) return;
    const { sharing } = req.body;
    const dashboard = await preferencesStore.updateDashboard(
      userId,
      req.params.id,
      { sharing },
    );
    if (!dashboard)
      return res.status(404).json({ error: "Dashboard not found" });
    return res.json(dashboard);
  } catch (err) {
    logger.error({ err, userId }, "Failed to update sharing");
    return res.status(500).json({ error: "Failed to update sharing" });
  }
});

// ── Dashboard Templates ──────────────────────────────────────────────

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  cards: Array<
    Omit<import("@/data/user-preferences").DashboardCard, "id" | "createdAt">
  >;
  layouts: import("@/data/user-preferences").CardLayout[];
}

function getDashboardTemplates(): DashboardTemplate[] {
  return [
    {
      id: "financial-overview",
      name: "Financial Overview",
      description: "P&L summary, balance sheet, and cash flow cards",
      category: "Finance",
      cards: [],
      layouts: [],
    },
    {
      id: "operations-monitor",
      name: "Operations Monitor",
      description: "Real-time operational metrics with auto-refresh",
      category: "Operations",
      cards: [],
      layouts: [],
    },
    {
      id: "executive-summary",
      name: "Executive Summary",
      description: "High-level KPI dashboard for leadership review",
      category: "Executive",
      cards: [],
      layouts: [],
    },
    {
      id: "data-quality",
      name: "Data Quality",
      description: "Data validation and anomaly detection dashboard",
      category: "Analytics",
      cards: [],
      layouts: [],
    },
  ];
}
