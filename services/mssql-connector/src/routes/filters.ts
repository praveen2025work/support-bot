import { Router, Request, Response } from "express";
import { connectionManager } from "@/core/connection-manager";
import { validateReadOnly } from "@/core/query-executor";
import { logger } from "@/lib/logger";

const router = Router();

/**
 * ── Filter-option endpoints ─────────────────────────────────────────
 *
 * These endpoints return filter dropdown values by running
 * pre-defined read-only queries against a connector.
 *
 * Every endpoint follows the standard filter response contract:
 *   [{ "value": "...", "label": "..." }, ...]
 *
 * The engine's dynamic-filter refresh calls these URLs directly.
 */

// ── GET /api/filters/:connectorId/departments ──────────────────────
// Sample: returns distinct department values from the connected database.
// Adjust the SQL to match your actual table/column names.
router.get("/:connectorId/departments", async (req: Request, res: Response) => {
  try {
    const connector = await connectionManager.getConnector(
      req.params.connectorId,
    );

    const sql = `SELECT DISTINCT Department AS value, Department AS label
                 FROM dbo.Departments
                 ORDER BY Department`;

    const validation = validateReadOnly(sql);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.reason });
    }

    const result = await connector.execute(sql, {}, 10000);
    const options = (result.rows || []).map((row: Record<string, unknown>) => ({
      value: String(row.value ?? ""),
      label: String(row.label ?? row.value ?? ""),
    }));

    return res.json(options);
  } catch (error) {
    logger.error(
      { error, connectorId: req.params.connectorId },
      "Failed to fetch departments",
    );
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch department filter options",
    });
  }
});

// ── Generic: GET /api/filters/:connectorId/query ───────────────────
// Accepts ?sql=SELECT... to run an arbitrary read-only SELECT and
// return the result in the standard filter contract shape.
// Use valueColumn & labelColumn query params to map columns.
router.get("/:connectorId/query", async (req: Request, res: Response) => {
  try {
    const sql = req.query.sql as string;
    if (!sql)
      return res.status(400).json({ error: "sql query param is required" });

    const validation = validateReadOnly(sql);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.reason });
    }

    const valueCol = (req.query.valueColumn as string) || "";
    const labelCol = (req.query.labelColumn as string) || valueCol;

    const connector = await connectionManager.getConnector(
      req.params.connectorId,
    );
    const result = await connector.execute(sql, {}, 10000);

    const columns = result.columns || [];
    const vCol = valueCol || columns[0] || "";
    const lCol = labelCol || vCol;

    const options = (result.rows || []).map((row: Record<string, unknown>) => ({
      value: String(row[vCol] ?? ""),
      label: String(row[lCol] ?? row[vCol] ?? ""),
    }));

    return res.json(options);
  } catch (error) {
    logger.error(
      { error, connectorId: req.params.connectorId },
      "Failed to fetch filter options via query",
    );
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch filter options",
    });
  }
});

export const filtersRouter = router;
export default router;
