import { Router, Request, Response } from "express";
import { promises as fsPromises, readFileSync } from "fs";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit-logger";
import { requirePermission } from "@/middleware/rbac";
import { paths } from "@/lib/env-config";
import { invalidateQueryData } from "@/lib/singleton";
import { config } from "@/lib/config";
import { rebuildAllGroupFiles } from "@/core/catalog/query-registry";
import { withFileLock } from "@/lib/file-lock";

const router = Router();

const DB_JSON_PATH = paths.mockApi.dbJson;

async function readDb(): Promise<Record<string, unknown>> {
  const raw = await fsPromises.readFile(DB_JSON_PATH, "utf-8");
  return JSON.parse(raw);
}

// Atomic write (temp + rename) so a concurrent reader never sees a partially
// written db.json. The temp name carries a random suffix because process.pid is
// not unique across PID-namespaced containers sharing a volume.
async function writeDb(data: Record<string, unknown>): Promise<void> {
  const tmp = `${DB_JSON_PATH}.tmp.${process.pid}.${randomBytes(4).toString("hex")}`;
  await fsPromises.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fsPromises.rename(tmp, DB_JSON_PATH);
}

/** Tell the Mock API (json-server) to reload db.json from disk into memory. */
async function reloadMockApi(): Promise<void> {
  try {
    const mockApiUrl = config.apiBaseUrl.replace(/\/api\/?$/, "");
    await fetch(`${mockApiUrl}/api/reload`, { method: "POST" });
    logger.info("Mock API db.json reloaded");
  } catch {
    // Mock API may not be running (production) — non-critical
  }
}

/**
 * Keep the per-group query files (the read source of truth) consistent with
 * db.json after an admin write. Bridge until the full per-group write path
 * (Plan 2) makes db.json unnecessary.
 */
function syncGroupQueryFiles(db: Record<string, unknown>): void {
  try {
    const groupsFile = JSON.parse(
      readFileSync(paths.config.groups, "utf-8"),
    ) as { groups: Record<string, { sources?: string[]; queries?: string[] }> };
    rebuildAllGroupFiles((db.queries as unknown[]) ?? [], groupsFile.groups);
  } catch (error) {
    logger.error({ error }, "Failed to sync per-group query files");
  }
}

/**
 * Serialize a db.json read-modify-write across engine instances sharing a
 * volume. Without this, two replicas can both read db.json, both mutate, and
 * the second write silently drops the first (lost update). The advisory lock
 * (mkdir-based, NFS/SMB-safe, auto-breaks after 30s) admits one writer at a
 * time; the per-group regen runs inside it so it always reflects the committed
 * db.json. Reads (GET) need no lock — writeDb is atomic, so a reader sees the
 * old or new file, never a partial one.
 */
function withDbLock<T>(fn: () => Promise<T>): Promise<T> {
  return withFileLock(DB_JSON_PATH, fn);
}

router.get(
  "/",
  requirePermission("queries.read"),
  async (req: Request, res: Response) => {
    try {
      const source = req.query.source as string | undefined;
      const db = await readDb();
      let queries = (db.queries || []) as Array<Record<string, unknown>>;
      if (source) {
        const sources = source.split(",").map((s) => s.trim());
        queries = queries.filter((q) => sources.includes(q.source as string));
      }
      return res.json({ queries });
    } catch (error) {
      logger.error({ error }, "Failed to read queries");
      return res.status(500).json({ queries: [] });
    }
  },
);

router.post(
  "/",
  requirePermission("queries.create"),
  async (req: Request, res: Response) => {
    try {
      return await withDbLock(async () => {
        const body = req.body;
        const {
          name,
          description,
          tags,
          owner,
          source,
          url,
          filters,
          estimatedDuration,
        } = body;
        const queryType = body.type || "api";
        if (!name) return res.status(400).json({ error: "name is required" });
        if (queryType !== "combined" && !source)
          return res.status(400).json({ error: "source is required" });

        const db = await readDb();
        const queries = (db.queries || []) as Array<Record<string, unknown>>;

        if (queryType === "url" && !url)
          return res
            .status(400)
            .json({ error: "URL-type queries require a url" });
        if ((queryType === "document" || queryType === "csv") && !body.filePath)
          return res
            .status(400)
            .json({ error: "Document/CSV-type queries require a filePath" });
        if (queryType === "api" && !body.endpoint)
          return res
            .status(400)
            .json({ error: "API-type queries require an endpoint" });
        if (
          queryType === "combined" &&
          (!body.combinedConfig ||
            !body.combinedConfig.subQueries ||
            body.combinedConfig.subQueries.length < 2)
        ) {
          return res.status(400).json({
            error:
              "Combined queries require at least 2 sub-queries in combinedConfig",
          });
        }

        // Build the full query record with all optional fields
        const baseRecord: Record<string, unknown> = {
          name,
          description: description || "",
          tags: tags || [],
          owner: owner || "",
          estimatedDuration: estimatedDuration || 2000,
          url: url || "",
          source: source || "",
          filters: filters || [],
          type: queryType,
          filePath: body.filePath || "",
          endpoint: body.endpoint || "",
        };
        // Preserve optional fields (baseUrl, method, columnConfig, chartConfig, authType, etc.)
        for (const key of [
          "baseUrl",
          "method",
          "authType",
          "bamTokenUrl",
          "columnConfig",
          "chartConfig",
          "drillDown",
          "combinedConfig",
          "fileBaseDir",
        ]) {
          if (body[key] !== undefined) baseRecord[key] = body[key];
        }

        // Upsert: if query with same name exists, update it; otherwise create new
        const existingIdx = queries.findIndex((q) => q.name === name);
        if (existingIdx !== -1) {
          const existing = queries[existingIdx];
          const updated = { ...existing, ...baseRecord };
          queries[existingIdx] = updated;
          db.queries = queries;
          await writeDb(db);
          syncGroupQueryFiles(db);
          invalidateQueryData();
          await reloadMockApi();
          await logAudit({
            action: "update",
            resource: "query",
            resourceId: existing.id as string,
            details: { name, source, type: queryType },
            ip: req.ip,
          });
          return res.json(updated);
        }

        const maxNum = queries
          .map((q) => parseInt((q.id as string).replace("q", ""), 10))
          .filter((n) => !isNaN(n))
          .reduce((max, n) => Math.max(max, n), 0);
        const newQuery = { id: `q${maxNum + 1}`, ...baseRecord };
        queries.push(newQuery);
        db.queries = queries;
        await writeDb(db);
        syncGroupQueryFiles(db);
        invalidateQueryData();
        await reloadMockApi();
        await logAudit({
          action: "create",
          resource: "query",
          resourceId: newQuery.id as string,
          details: { name, source, type: queryType },
          ip: req.ip,
        });
        return res.status(201).json(newQuery);
      });
    } catch (error) {
      logger.error({ error }, "Failed to create query");
      return res.status(500).json({ error: "Failed to create query" });
    }
  },
);

router.patch(
  "/",
  requirePermission("queries.update"),
  async (req: Request, res: Response) => {
    try {
      return await withDbLock(async () => {
        const { id, ...updates } = req.body;
        if (!id) return res.status(400).json({ error: "id is required" });
        const db = await readDb();
        const queries = (db.queries || []) as Array<Record<string, unknown>>;
        const idx = queries.findIndex((q) => q.id === id);
        if (idx === -1)
          return res.status(404).json({ error: "Query not found" });

        const query = queries[idx];
        for (const [k, v] of Object.entries(updates)) {
          query[k] = v;
        }
        if (req.body.description !== undefined)
          query.description = req.body.description;
        if (req.body.tags !== undefined) query.tags = req.body.tags;
        if (req.body.owner !== undefined) query.owner = req.body.owner;
        queries[idx] = query;
        db.queries = queries;
        await writeDb(db);
        syncGroupQueryFiles(db);
        invalidateQueryData();
        await reloadMockApi();
        await logAudit({
          action: "update",
          resource: "query",
          resourceId: id,
          details: updates,
          ip: req.ip,
        });
        return res.json(query);
      });
    } catch (error) {
      logger.error({ error }, "Failed to update query");
      return res.status(500).json({ error: "Failed to update query" });
    }
  },
);

router.delete(
  "/",
  requirePermission("queries.delete"),
  async (req: Request, res: Response) => {
    try {
      return await withDbLock(async () => {
        const id = req.query.id as string;
        if (!id)
          return res.status(400).json({ error: "id query param is required" });
        const db = await readDb();
        const queries = (db.queries || []) as Array<Record<string, unknown>>;
        const idx = queries.findIndex((q) => q.id === id);
        if (idx === -1)
          return res.status(404).json({ error: "Query not found" });
        queries.splice(idx, 1);
        db.queries = queries;
        await writeDb(db);
        syncGroupQueryFiles(db);
        invalidateQueryData();
        await reloadMockApi();
        await logAudit({
          action: "delete",
          resource: "query",
          resourceId: id,
          ip: req.ip,
        });
        return res.json({ success: true, deletedQueryId: id });
      });
    } catch (error) {
      logger.error({ error }, "Failed to delete query");
      return res.status(500).json({ error: "Failed to delete query" });
    }
  },
);

// POST /cache/clear — clear the in-memory query cache (called by Next.js after db.json writes)
router.post("/cache/clear", (_req: Request, res: Response) => {
  invalidateQueryData();
  logger.info("Query caches cleared and engines invalidated via admin API");
  return res.json({ success: true });
});

export default router;
