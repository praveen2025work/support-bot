import { Router, Request, Response } from "express";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit-logger";
import { requirePermission } from "@/middleware/rbac";
import { paths } from "@/lib/env-config";
import { invalidateQueryData } from "@/lib/singleton";
import {
  getGroupQueries,
  getAllQueries,
  saveQuery,
  updateGroupQuery,
  deleteQuery,
  invalidateQueryRegistry,
} from "@/core/catalog/query-registry";
import { withFileLock } from "@/lib/file-lock";

const router = Router();

/**
 * Per-group query CRUD backed by the file-based per-group store
 * (DATA_DIR/queries/<group>.json) — the single source of truth for query
 * definitions. No db.json: the mock-api fixture is data-only, so this works
 * identically in dev/uat/demo/prod. The UI proxies here; the engine is the
 * single writer.
 */

/**
 * Serialize read-modify-write on a group's query file so two concurrent admin
 * writes can't lose an update. Lock is keyed on the group's file path.
 */
function withGroupLock<T>(groupId: string, fn: () => Promise<T>): Promise<T> {
  return withFileLock(paths.data.queries(groupId), fn);
}

/**
 * Group ids address per-group files; constrain to the safe charset at the
 * boundary so a raw value never reaches a path, cache key, or audit log.
 */
function sanitizeGroupId(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.replace(/[^a-zA-Z0-9_\-]/g, "_");
  return clean.length > 0 ? clean : null;
}

/** Resolve a sanitized groupId from query string or body; 400s when absent. */
function requireGroupId(req: Request, res: Response): string | null {
  const groupId = sanitizeGroupId(
    (req.query.groupId as string | undefined) ?? req.body?.groupId,
  );
  if (!groupId) {
    res.status(400).json({ error: "groupId is required" });
    return null;
  }
  return groupId;
}

// GET /?groupId=&source= — list a group's queries (or all groups' when no id)
router.get(
  "/",
  requirePermission("queries.read"),
  (req: Request, res: Response) => {
    try {
      const groupId = sanitizeGroupId(req.query.groupId) ?? undefined;
      const source = req.query.source as string | undefined;
      let queries: Array<{ source?: string }> = groupId
        ? getGroupQueries(groupId)
        : getAllQueries();
      if (source) {
        const sources = source.split(",").map((s) => s.trim());
        queries = queries.filter((q) => q.source && sources.includes(q.source));
      }
      return res.json({ queries });
    } catch (error) {
      logger.error({ error }, "Failed to read queries");
      return res.status(500).json({ queries: [] });
    }
  },
);

// POST / — create (or update-by-name) a query within a group
router.post(
  "/",
  requirePermission("queries.create"),
  async (req: Request, res: Response) => {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    try {
      // Client-supplied id is ignored on create — the store assigns it.
      const { groupId: _gid, id: _id, ...input } = req.body ?? {};
      void _gid;
      void _id;
      if (!input.name)
        return res.status(400).json({ error: "name is required" });

      const queryType = input.type || "api";
      if (queryType === "url" && !input.url)
        return res
          .status(400)
          .json({ error: "URL-type queries require a url" });
      if (
        (queryType === "document" ||
          queryType === "csv" ||
          queryType === "xlsx") &&
        !input.filePath
      )
        return res
          .status(400)
          .json({ error: "Document/CSV/XLSX-type queries require a filePath" });
      if (queryType === "api" && !input.endpoint)
        return res
          .status(400)
          .json({ error: "API-type queries require an endpoint" });
      const combinedConfig = input.combinedConfig as
        | { subQueries?: unknown[] }
        | undefined;
      if (
        queryType === "combined" &&
        (!combinedConfig?.subQueries || combinedConfig.subQueries.length < 2)
      )
        return res.status(400).json({
          error:
            "Combined queries require at least 2 sub-queries in combinedConfig",
        });

      // Distinguish create (201) from name-based upsert (200), inside the lock.
      const { saved, created } = await withGroupLock(groupId, async () => {
        const existed = getGroupQueries(groupId).some(
          (q) => q.name === input.name,
        );
        return { saved: saveQuery(groupId, input), created: !existed };
      });
      invalidateQueryRegistry(groupId);
      invalidateQueryData();
      await logAudit({
        action: created ? "create" : "update",
        resource: "query",
        resourceId: saved.id,
        details: { name: saved.name, groupId, type: saved.type },
        ip: req.ip,
      });
      return res.status(created ? 201 : 200).json(saved);
    } catch (error) {
      logger.error({ error }, "Failed to create query");
      return res.status(500).json({ error: "Failed to create query" });
    }
  },
);

// PATCH / — update a query (by id) within a group
router.patch(
  "/",
  requirePermission("queries.update"),
  async (req: Request, res: Response) => {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    try {
      const { id, groupId: _gid, ...updates } = req.body ?? {};
      void _gid;
      if (!id) return res.status(400).json({ error: "id is required" });
      const updated = await withGroupLock(groupId, async () =>
        updateGroupQuery(groupId, id, updates),
      );
      if (!updated) return res.status(404).json({ error: "Query not found" });
      invalidateQueryRegistry(groupId);
      invalidateQueryData();
      await logAudit({
        action: "update",
        resource: "query",
        resourceId: id,
        details: { groupId },
        ip: req.ip,
      });
      return res.json(updated);
    } catch (error) {
      logger.error({ error }, "Failed to update query");
      return res.status(500).json({ error: "Failed to update query" });
    }
  },
);

// DELETE /?groupId=&id= — remove a query (by id) within a group
router.delete(
  "/",
  requirePermission("queries.delete"),
  async (req: Request, res: Response) => {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    try {
      const id = req.query.id as string;
      if (!id)
        return res.status(400).json({ error: "id query param is required" });
      const removed = await withGroupLock(groupId, async () =>
        deleteQuery(groupId, id),
      );
      if (!removed) return res.status(404).json({ error: "Query not found" });
      invalidateQueryRegistry(groupId);
      invalidateQueryData();
      await logAudit({
        action: "delete",
        resource: "query",
        resourceId: id,
        details: { groupId },
        ip: req.ip,
      });
      return res.json({ success: true, deletedQueryId: id });
    } catch (error) {
      logger.error({ error }, "Failed to delete query");
      return res.status(500).json({ error: "Failed to delete query" });
    }
  },
);

// POST /cache/clear — clear the in-memory query caches (called after writes)
router.post("/cache/clear", (_req: Request, res: Response) => {
  invalidateQueryRegistry();
  invalidateQueryData();
  logger.info("Query caches cleared and engines invalidated via admin API");
  return res.json({ success: true });
});

export default router;
