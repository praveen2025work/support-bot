import { Router, Request, Response } from "express";
import { queryStore } from "@/core/query-store";
import { connectionManager } from "@/core/connection-manager";
import { logger } from "@/lib/logger";
import type { SavedQuery, QueryPipeline } from "@/core/types";

const router = Router();

// ── List queries ────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const connectorId = req.query.connectorId as string | undefined;
    const queries = await queryStore.list(connectorId);
    return res.json({ queries });
  } catch (error) {
    logger.error({ error }, "Failed to list queries");
    return res.status(500).json({ error: "Failed to list queries" });
  }
});

// ── Get query ───────────────────────────────────────────────────────
router.get("/:queryId", async (req: Request, res: Response) => {
  try {
    const query = await queryStore.get(req.params.queryId);
    if (!query) return res.status(404).json({ error: "Query not found" });
    return res.json(query);
  } catch (error) {
    logger.error({ error }, "Failed to get query");
    return res.status(500).json({ error: "Failed to get query" });
  }
});

// ── Create query ────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      id,
      name,
      description,
      connectorId,
      pipeline,
      filters,
      chartConfig,
      maxRows,
      status,
    } = req.body;
    if (!id || !name || !connectorId) {
      return res
        .status(400)
        .json({ error: "id, name, and connectorId are required" });
    }

    const now = new Date().toISOString();
    const query: SavedQuery = {
      id,
      name,
      description: description || "",
      connectorId,
      pipeline,
      filters,
      chartConfig,
      maxRows: maxRows || 10000,
      status: status || "draft",
      createdAt: now,
      updatedAt: now,
    };

    const created = await queryStore.create(query);
    return res.status(201).json(created);
  } catch (error) {
    logger.error({ error }, "Failed to create query");
    return res
      .status(500)
      .json({
        error:
          error instanceof Error ? error.message : "Failed to create query",
      });
  }
});

// ── Update query ────────────────────────────────────────────────────
router.put("/:queryId", async (req: Request, res: Response) => {
  try {
    const updated = await queryStore.update(req.params.queryId, req.body);
    return res.json(updated);
  } catch (error) {
    logger.error({ error }, "Failed to update query");
    return res
      .status(500)
      .json({
        error:
          error instanceof Error ? error.message : "Failed to update query",
      });
  }
});

// ── Delete query ────────────────────────────────────────────────────
router.delete("/:queryId", async (req: Request, res: Response) => {
  try {
    await queryStore.delete(req.params.queryId);
    return res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to delete query");
    return res
      .status(500)
      .json({
        error:
          error instanceof Error ? error.message : "Failed to delete query",
      });
  }
});

// ── Execute query ───────────────────────────────────────────────────
router.post("/:queryId/execute", async (req: Request, res: Response) => {
  try {
    const query = await queryStore.get(req.params.queryId);
    if (!query) return res.status(404).json({ error: "Query not found" });

    const pipeline: QueryPipeline = query.pipeline || { select: [] };

    // Apply runtime filters from request body
    const filters = req.body.filters as Record<string, string> | undefined;
    if (filters && query.filters) {
      const whereConditions = [...(pipeline.where || [])];
      for (const filterDef of query.filters) {
        const value = filters[filterDef.key];
        if (value == null || value === "") continue;
        const col = filterDef.column || filterDef.key;

        if (value.includes(",")) {
          whereConditions.push({
            column: col,
            operator: "in",
            value: value.split(",").map((v) => v.trim()),
          });
        } else {
          whereConditions.push({ column: col, operator: "eq", value });
        }
      }
      pipeline.where = whereConditions.length > 0 ? whereConditions : undefined;
    }

    if (query.maxRows && !pipeline.limit) {
      pipeline.limit = query.maxRows;
    }

    const result = await connectionManager.executeQuery(
      query.connectorId,
      pipeline,
    );

    return res.json({
      data: result.rows,
      rowCount: result.rowCount,
      executionTime: result.executionMs,
      columns: result.columns,
      truncated: result.truncated,
    });
  } catch (error) {
    logger.error({ error }, "Failed to execute query");
    return res
      .status(500)
      .json({
        error:
          error instanceof Error ? error.message : "Failed to execute query",
      });
  }
});

export const queriesRouter = router;
export default router;
