import { Router, Request, Response } from "express";
import { queryStore } from "@/core/query-store";
import { connectionManager } from "@/core/connection-manager";
import { validateReadOnly, validateProcedureCall } from "@/core/query-executor";
import { logger } from "@/lib/logger";
import type { SavedQuery } from "@/core/types";

const router = Router();

// ── List saved queries ──────────────────────────────────────────────
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

// ── Get single query ────────────────────────────────────────────────
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

// ── Create saved query ──────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      id,
      name,
      description,
      connectorId,
      sqlText,
      procedureName,
      parameters,
      filters,
      maxRows,
    } = req.body;

    if (!id || !name || !connectorId) {
      return res
        .status(400)
        .json({ error: "id, name, and connectorId are required" });
    }

    if (!sqlText && !procedureName) {
      return res
        .status(400)
        .json({ error: "Either sqlText or procedureName is required" });
    }

    // Verify connector exists
    const connConfig = await connectionManager.getConfig(connectorId);
    if (!connConfig) {
      return res
        .status(404)
        .json({ error: `Connector "${connectorId}" not found` });
    }

    // Validate SQL if provided
    if (sqlText) {
      const validation = validateReadOnly(sqlText);
      if (!validation.valid) {
        return res
          .status(400)
          .json({ error: `SQL validation failed: ${validation.reason}` });
      }
    }

    // Validate procedure name if provided
    if (procedureName) {
      const validation = validateProcedureCall(procedureName);
      if (!validation.valid) {
        return res
          .status(400)
          .json({ error: `Procedure validation failed: ${validation.reason}` });
      }
    }

    const now = new Date().toISOString();
    const query: SavedQuery = {
      id,
      name,
      description: description || "",
      connectorId,
      sqlText: sqlText || undefined,
      procedureName: procedureName || undefined,
      parameters: parameters || undefined,
      filters: filters || [],
      maxRows: maxRows || 10000,
      createdAt: now,
      updatedAt: now,
    };

    const created = await queryStore.create(query);
    return res.status(201).json(created);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to create query";
    logger.error({ error }, "Failed to create query");
    if (msg.includes("already exists")) {
      return res.status(409).json({ error: msg });
    }
    return res.status(500).json({ error: msg });
  }
});

// ── Update saved query ──────────────────────────────────────────────
router.put("/:queryId", async (req: Request, res: Response) => {
  try {
    const queryId = req.params.queryId;
    const updates = req.body;

    // Re-validate SQL if it changed
    if (updates.sqlText) {
      const validation = validateReadOnly(updates.sqlText);
      if (!validation.valid) {
        return res
          .status(400)
          .json({ error: `SQL validation failed: ${validation.reason}` });
      }
    }

    // Re-validate procedure name if it changed
    if (updates.procedureName) {
      const validation = validateProcedureCall(updates.procedureName);
      if (!validation.valid) {
        return res
          .status(400)
          .json({ error: `Procedure validation failed: ${validation.reason}` });
      }
    }

    const updated = await queryStore.update(queryId, updates);
    return res.json(updated);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to update query";
    logger.error({ error }, "Failed to update query");
    if (msg.includes("not found")) {
      return res.status(404).json({ error: msg });
    }
    return res.status(500).json({ error: msg });
  }
});

// ── Delete saved query ──────────────────────────────────────────────
router.delete("/:queryId", async (req: Request, res: Response) => {
  try {
    await queryStore.delete(req.params.queryId);
    return res.json({ success: true, deletedQueryId: req.params.queryId });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to delete query";
    logger.error({ error }, "Failed to delete query");
    if (msg.includes("not found")) {
      return res.status(404).json({ error: msg });
    }
    return res.status(500).json({ error: msg });
  }
});

// ── Execute saved query ─────────────────────────────────────────────
// POST /api/queries/:queryId/execute
// Called by the engine (or any client) to run a saved query.
// Body: { filters?: Record<string, string> }
// Returns: { data: [...], rowCount, executionTime }
router.post("/:queryId/execute", async (req: Request, res: Response) => {
  try {
    const queryId = req.params.queryId;
    const { filters } = req.body || {};

    // 1. Look up saved query
    const query = await queryStore.get(queryId);
    if (!query) {
      return res.status(404).json({ error: `Query "${queryId}" not found` });
    }

    // 2. Get connector
    const connector = await connectionManager.getConnector(query.connectorId);

    // 3. Build SQL with filter substitution
    let sql = query.sqlText || "";
    const sqlParams: Record<string, unknown> = {};

    if (query.procedureName) {
      // For stored procedures, build EXEC call
      sql = `EXEC ${query.procedureName}`;
      if (query.parameters && query.parameters.length > 0) {
        const paramParts = query.parameters.map((p) => {
          const value = filters?.[p.name] ?? p.defaultValue ?? null;
          sqlParams[p.name] = value;
          return `@${p.name} = @${p.name}`;
        });
        sql += " " + paramParts.join(", ");
      }
    } else if (sql && filters && query.filters) {
      // Build dynamic WHERE clause for filters not already referenced in SQL
      const dynamicConditions: string[] = [];
      for (const filterDef of query.filters) {
        const colRef =
          (filterDef as { column?: string }).column || filterDef.key;
        const col = colRef.includes(".") ? colRef : `[${colRef}]`;

        // ── Multi-select: comma-separated → IN clause ──
        if (
          filters[filterDef.key] !== undefined &&
          String(filters[filterDef.key]).includes(",")
        ) {
          const parts = String(filters[filterDef.key])
            .split(",")
            .filter(Boolean);
          if (parts.length > 0 && !sql.includes(`@${filterDef.key}`)) {
            const inParams: string[] = [];
            parts.forEach((val, idx) => {
              const pName = `${filterDef.key}_${idx}`;
              sqlParams[pName] = val;
              inParams.push(`@${pName}`);
            });
            dynamicConditions.push(`${col} IN (${inParams.join(", ")})`);
          }
          continue;
        }

        // ── Range filters: _start/_end (date_range) and _min/_max (number_range) ──
        const startVal = filters[`${filterDef.key}_start`];
        const endVal = filters[`${filterDef.key}_end`];
        if (startVal !== undefined || endVal !== undefined) {
          if (startVal !== undefined && startVal !== "") {
            const pStart = `${filterDef.key}_start`;
            sqlParams[pStart] = startVal;
            if (!sql.includes(`@${pStart}`))
              dynamicConditions.push(`${col} >= @${pStart}`);
          }
          if (endVal !== undefined && endVal !== "") {
            const pEnd = `${filterDef.key}_end`;
            sqlParams[pEnd] = endVal;
            if (!sql.includes(`@${pEnd}`))
              dynamicConditions.push(`${col} <= @${pEnd}`);
          }
          continue;
        }
        const minVal = filters[`${filterDef.key}_min`];
        const maxVal = filters[`${filterDef.key}_max`];
        if (minVal !== undefined || maxVal !== undefined) {
          if (minVal !== undefined && minVal !== "") {
            const pMin = `${filterDef.key}_min`;
            sqlParams[pMin] = Number(minVal);
            if (!sql.includes(`@${pMin}`))
              dynamicConditions.push(`${col} >= @${pMin}`);
          }
          if (maxVal !== undefined && maxVal !== "") {
            const pMax = `${filterDef.key}_max`;
            sqlParams[pMax] = Number(maxVal);
            if (!sql.includes(`@${pMax}`))
              dynamicConditions.push(`${col} <= @${pMax}`);
          }
          continue;
        }

        // ── Standard equality / search ──
        if (filters[filterDef.key] !== undefined) {
          const filterType = (filterDef as { type?: string }).type;
          sqlParams[filterDef.key] = filters[filterDef.key];
          if (!sql.includes(`@${filterDef.key}`)) {
            if (filterType === "search") {
              dynamicConditions.push(
                `${col} LIKE '%' + @${filterDef.key} + '%'`,
              );
            } else {
              dynamicConditions.push(`${col} = @${filterDef.key}`);
            }
          }
        }
      }
      // Append dynamic WHERE clause if needed
      if (dynamicConditions.length > 0) {
        const trimmedSql = sql.replace(/;\s*$/, "").trim();
        const whereClause = dynamicConditions.join(" AND ");
        const hasWhere = /\bWHERE\b/i.test(trimmedSql);

        // Find the position of trailing clauses (GROUP BY, HAVING, ORDER BY) to insert WHERE before them
        const trailingMatch = trimmedSql.match(
          /\b(GROUP\s+BY|HAVING|ORDER\s+BY)\b/i,
        );
        if (trailingMatch && trailingMatch.index !== undefined && !hasWhere) {
          const before = trimmedSql.slice(0, trailingMatch.index).trimEnd();
          const after = trimmedSql.slice(trailingMatch.index);
          sql = `${before} WHERE ${whereClause} ${after}`;
        } else if (
          hasWhere &&
          trailingMatch &&
          trailingMatch.index !== undefined
        ) {
          // Has WHERE and trailing clauses — insert AND before trailing clauses
          const before = trimmedSql.slice(0, trailingMatch.index).trimEnd();
          const after = trimmedSql.slice(trailingMatch.index);
          sql = `${before} AND ${whereClause} ${after}`;
        } else {
          sql = hasWhere
            ? `${trimmedSql} AND ${whereClause}`
            : `${trimmedSql} WHERE ${whereClause}`;
        }
      }
    }

    if (!sql) {
      return res
        .status(400)
        .json({ error: "Query has no SQL text or procedure name" });
    }

    // 4. Validate read-only (skip for stored procedures — they are pre-validated on save)
    if (!query.procedureName) {
      const validation = validateReadOnly(sql);
      if (!validation.valid) {
        return res
          .status(400)
          .json({ error: `SQL blocked: ${validation.reason}` });
      }
    }

    // 5. Execute
    const startTime = Date.now();
    const result = await connector.execute(
      sql,
      sqlParams,
      query.maxRows || 10000,
    );
    const executionTime = Date.now() - startTime;

    // 6. Return in the shape the engine expects: { data, rowCount, executionTime }
    return res.json({
      data: result.rows,
      rowCount: result.rowCount,
      executionTime,
      columns: result.columns,
      truncated: result.truncated || false,
    });
  } catch (error) {
    logger.error(
      { error, queryId: req.params.queryId },
      "Failed to execute query",
    );
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to execute query",
    });
  }
});

export const queriesRouter = router;
export default router;
