/**
 * Data-source health admin routes.
 *
 *   GET  /api/admin/sources/health           — current snapshot
 *   POST /api/admin/sources/recheck          — force an immediate probe
 *
 * The data behind these endpoints is maintained by
 * apps/engine/src/core/sources/health-monitor.ts — they're a thin
 * surface over that in-memory state for the admin UI.
 */

import { Router, Request, Response } from "express";
import { logger } from "@/lib/logger";
import { requirePermission } from "@/middleware/rbac";
import { getAllHealth, probeAll } from "@/core/sources/health-monitor";

const router = Router();

router.get(
  "/health",
  requirePermission("analytics.view"),
  (_req: Request, res: Response) => {
    const sources = getAllHealth();
    const okCount = sources.filter((s) => s.status === "ok").length;
    const unreachableCount = sources.filter(
      (s) => s.status === "unreachable",
    ).length;
    return res.json({
      total: sources.length,
      ok: okCount,
      unreachable: unreachableCount,
      unknown: sources.length - okCount - unreachableCount,
      sources,
    });
  },
);

router.post(
  "/recheck",
  requirePermission("learning.manage"),
  async (_req: Request, res: Response) => {
    try {
      const sources = await probeAll();
      return res.json({
        rechecked: sources.length,
        sources,
      });
    } catch (err) {
      logger.error({ err }, "sources route: recheck failed");
      return res.status(500).json({ error: "Recheck failed" });
    }
  },
);

export default router;
