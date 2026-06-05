import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import _path from "path";
import { getGroupConfig, getGroupConfigs } from "@/config/group-config";
import { ApiClient } from "@/core/api-connector/api-client";
import { paths } from "@/lib/env-config";
import { QueryService } from "@/core/api-connector/query-service";
import { extractDataArray } from "@/core/api-connector/join-engine";
import { getSemanticIndex } from "@/core/semantic/semantic-index";
import {
  loadUserPickWeights,
  recordPick,
} from "@/core/recommendations/search-picks";
import { getInteractionTracker } from "@/core/recommendations/interaction-tracker";
import { logger } from "@/lib/logger";

export const queriesRouter = Router();

// GET /api/queries/preview — preview sample rows from a query (for join key selection in admin UI)
queriesRouter.get("/queries/preview", async (req: Request, res: Response) => {
  try {
    const queryName = req.query.queryName as string;
    const groupId = (req.query.groupId as string) || "default";
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

    if (!queryName) {
      return res.status(400).json({ error: "queryName is required" });
    }

    const groupConfig = getGroupConfig(groupId);
    const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
    const queryService = new QueryService(
      apiClient,
      groupConfig.sources,
      groupConfig.queries,
      groupId,
    );
    const result = await queryService.executeQuery(queryName);

    // Extract columns + first N rows from any result type (API, CSV, XLSX)
    const data = extractDataArray(result);
    const columns =
      data.length > 0 ? Object.keys(data[0]) : result.csvResult?.headers || [];

    return res.json({
      columns,
      rows: data.slice(0, limit),
      totalRows: data.length,
    });
  } catch (error) {
    logger.error({ error }, "Query preview error");
    return res
      .status(500)
      .json({ error: "Preview failed", columns: [], rows: [], totalRows: 0 });
  }
});

// GET /api/queries — list queries for a group
// When `?userName=X` is provided, results are reordered so queries the
// caller has used recently bubble to the top and carry `recent: true`.
// Reuses the shared interaction-tracker (chat + Data Explorer both
// write to it), so usage history is unified across surfaces.
queriesRouter.get("/queries", async (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const userName =
      typeof req.query.userName === "string" ? req.query.userName : "";
    const groupConfig = getGroupConfig(groupId);
    const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
    const queryService = new QueryService(
      apiClient,
      groupConfig.sources,
      groupConfig.queries,
      groupId,
    );
    const queries = await queryService.getQueries();

    const shaped = queries.map((q) => ({
      name: q.name,
      description: q.description,
      filters: q.filters || [],
      type: q.type ?? "api",
      ...(q.drillDown ? { drillDown: q.drillDown } : {}),
      ...(q.combinedConfig ? { combinedConfig: q.combinedConfig } : {}),
      ...(q.actionConfig ? { actionConfig: q.actionConfig } : {}),
      ...(q.columnConfig ? { columnConfig: q.columnConfig } : {}),
    }));

    let recentNames = new Set<string>();
    if (userName) {
      try {
        const tracker = getInteractionTracker(groupId);
        const interactions = await tracker.readAll();
        const counts = new Map<string, number>();
        for (const i of interactions
          .filter((i) => i.userId === userName)
          .slice(-200)) {
          counts.set(i.queryName, (counts.get(i.queryName) ?? 0) + 1);
        }
        recentNames = new Set(counts.keys());
        if (counts.size > 0) {
          shaped.sort((a, b) => {
            const ca = counts.get(a.name) ?? 0;
            const cb = counts.get(b.name) ?? 0;
            if (ca !== cb) return cb - ca;
            return a.name.localeCompare(b.name);
          });
        }
      } catch {
        /* best-effort */
      }
    }

    return res.json({
      queries: shaped.map((q) => ({
        ...q,
        ...(recentNames.has(q.name) ? { recent: true } : {}),
      })),
    });
  } catch (error) {
    logger.error({ error }, "Queries API error");
    return res.status(500).json({ queries: [] });
  }
});

// GET /api/queries/search — semantic search across queries
queriesRouter.get("/queries/search", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    const groupId = (req.query.groupId as string) || "default";
    // userName lets us personalise the ranking using prior picks. Absent
    // → falls back to pure semantic scoring (anonymous behaviour).
    const userName =
      typeof req.query.userName === "string" ? req.query.userName : "";
    if (!q.trim()) return res.json({ results: [] });

    const groupConfig = getGroupConfig(groupId);
    const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
    const queryService = new QueryService(
      apiClient,
      groupConfig.sources,
      groupConfig.queries,
      groupId,
    );

    const queries = await queryService.getQueries();
    const allowedNames = new Set(queries.map((query) => query.name));
    const idx = getSemanticIndex(groupId);
    if (!idx.hasSameQueries(queries)) {
      idx.buildIndex(
        queries.map((qr) => ({ name: qr.name, description: qr.description })),
      );
      idx.save().catch(() => {});
    }

    const results = idx
      .search(q, 10)
      .filter((result) => allowedNames.has(result.queryName));

    // Personalised bump — when a userName is supplied, add the user's
    // decayed click-through weight for each candidate. Modest multiplier
    // so a strong typed query still beats a stale habit.
    const BUMP_MULTIPLIER = 0.5;
    if (userName) {
      try {
        const weights = await loadUserPickWeights(groupId, userName);
        if (weights.size > 0) {
          for (const r of results) {
            const w = weights.get(r.queryName);
            if (w) {
              (r as { score: number }).score += w * BUMP_MULTIPLIER;
            }
          }
          results.sort(
            (a, b) =>
              (b as { score: number }).score - (a as { score: number }).score,
          );
        }
      } catch {
        /* personalisation is best-effort; never break the search */
      }
    }

    return res.json({ results });
  } catch (error) {
    logger.error({ error }, "Semantic search error");
    return res.json({ results: [] });
  }
});

// POST /api/queries/search/pick — records that a user accepted a
// suggestion. Used by the autocomplete dropdown to learn which queries
// the user actually uses, so the next search ranks them higher.
queriesRouter.post(
  "/queries/search/pick",
  async (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      const groupId =
        typeof body.groupId === "string" ? body.groupId : "default";
      const userName = typeof body.userName === "string" ? body.userName : "";
      const queryName =
        typeof body.queryName === "string" ? body.queryName : "";
      const query = typeof body.query === "string" ? body.query : "";
      if (!userName || !queryName) {
        // Anonymous picks or malformed bodies are not an error — just a
        // no-op acknowledgment. The autocomplete doesn't surface the
        // failure either way.
        return res.json({ recorded: false });
      }
      await recordPick(groupId, { userName, queryName, query });
      return res.json({ recorded: true });
    } catch (error) {
      logger.error({ error }, "search-picks: record failed");
      return res.json({ recorded: false });
    }
  },
);

// GET /api/filters — return filter config for chat UI
queriesRouter.get("/filters", async (_req: Request, res: Response) => {
  try {
    const configPath = paths.config.filterConfig;
    const raw = await fs.readFile(configPath, "utf-8");
    const data = JSON.parse(raw);
    return res.json(data);
  } catch {
    return res.json({ filters: {} });
  }
});

// POST /api/write — proxy write-back to the appropriate connector/mock-api
queriesRouter.post("/write", async (req: Request, res: Response) => {
  try {
    const { queryName, groupId, changes } = req.body;
    if (!queryName || !changes || !Array.isArray(changes)) {
      return res
        .status(400)
        .json({ error: "queryName and changes array are required" });
    }

    const gid = groupId || "default";
    const groupConfig = getGroupConfig(gid);
    const apiBaseUrl = groupConfig.apiBaseUrl || "http://localhost:4002";

    logger.info(
      { queryName, groupId: gid, changeCount: changes.length },
      "Write-back proxy request",
    );

    // Forward to connector/mock-api
    const response = await fetch(`${apiBaseUrl}/api/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queryName, changes }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error(
        { status: response.status, body: errText },
        "Connector write-back failed",
      );
      return res.status(response.status).json({ error: errText });
    }

    const result = await response.json();
    return res.json(result);
  } catch (error) {
    logger.error({ error }, "Write-back proxy error");
    return res.status(500).json({ error: "Write-back failed" });
  }
});

// GET /api/groups — list all groups
queriesRouter.get("/groups", (_req: Request, res: Response) => {
  const configs = getGroupConfigs();
  const groups = Object.entries(configs).map(([id, config]) => ({
    id,
    name: config.name,
    description: config.description,
  }));
  return res.json({ groups });
});
