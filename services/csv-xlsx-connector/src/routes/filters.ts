import { Router, Request, Response } from "express";
import { connectionManager } from "@/core/connection-manager";
import { logger } from "@/lib/logger";

const router = Router();

// ── Get distinct values for a column ────────────────────────────────
router.get("/:connectorId/:column", async (req: Request, res: Response) => {
  try {
    const { connectorId, column } = req.params;
    const config = await connectionManager.getConfig(connectorId);
    if (!config) return res.status(404).json({ error: "Connector not found" });

    const result = await connectionManager.executeQuery(connectorId, {
      select: [column],
    });

    const distinct = [
      ...new Set(result.rows.map((r) => String(r[column] ?? ""))),
    ]
      .filter(Boolean)
      .sort();
    return res.json(distinct.map((v) => ({ value: v, label: v })));
  } catch (error) {
    logger.error({ error }, "Failed to get filter values");
    return res.status(500).json({ error: "Failed to get filter values" });
  }
});

export const filtersRouter = router;
export default router;
