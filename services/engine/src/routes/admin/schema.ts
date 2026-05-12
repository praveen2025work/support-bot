/**
 * Schema drift admin routes.
 *
 * GET    /api/admin/schema/drift?groupId=X       — list flagged schemas
 * POST   /api/admin/schema/acknowledge           — clear the drift flag
 *          body: { groupId, queryName }
 *
 * Drift is detected inline during query execution (see
 * services/engine/src/core/response/handlers/query-handler.ts); this
 * route just surfaces the registry contents for the admin UI.
 */

import { Router, Request, Response } from "express";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit-logger";
import { requirePermission } from "@/middleware/rbac";
import { acknowledgeDrift, listFlaggedSchemas } from "@/core/schema/registry";
import { invalidateGroupQuery } from "@/core/cache/query-cache";

const router = Router();

router.get(
  "/drift",
  requirePermission("learning.manage"),
  async (req: Request, res: Response) => {
    try {
      const groupId =
        typeof req.query.groupId === "string" ? req.query.groupId : undefined;
      const flagged = await listFlaggedSchemas(groupId);
      return res.json({
        groupId: groupId ?? "all",
        count: flagged.length,
        flagged: flagged.map((s) => ({
          groupId: s.groupId,
          queryName: s.queryName,
          observedAt: s.observedAt,
          driftFlaggedAt: s.driftFlaggedAt,
          drift: s.lastDrift,
        })),
      });
    } catch (err) {
      logger.error({ err }, "schema route: GET /drift failed");
      return res.status(500).json({ error: "Failed to list drift" });
    }
  },
);

router.post(
  "/acknowledge",
  requirePermission("learning.manage"),
  async (req: Request, res: Response) => {
    try {
      const { groupId, queryName } = req.body ?? {};
      if (typeof groupId !== "string" || typeof queryName !== "string") {
        return res.status(400).json({
          error: "Body must include groupId (string) and queryName (string)",
        });
      }
      const ok = await acknowledgeDrift(groupId, queryName);
      if (!ok) {
        return res.status(404).json({ error: "No schema record found" });
      }
      // Drop any cached results for this (group, query) — they may
      // still carry the schemaDrift payload, and the admin just said
      // "the new shape is fine." Next chat call will refetch and
      // attach no drift since the registry now matches.
      const evicted = invalidateGroupQuery(groupId, queryName);
      await logAudit({
        action: "update",
        resource: "schema-drift-ack",
        resourceId: queryName,
        groupId,
        details: { cacheEvicted: evicted },
        ip: req.ip,
      });
      return res.json({
        success: true,
        groupId,
        queryName,
        cacheEvicted: evicted,
      });
    } catch (err) {
      logger.error({ err }, "schema route: POST /acknowledge failed");
      return res.status(500).json({ error: "Failed to acknowledge drift" });
    }
  },
);

export default router;
