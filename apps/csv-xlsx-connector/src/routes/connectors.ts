import { Router, Request, Response } from "express";
import { connectionManager } from "@/core/connection-manager";
import { logger } from "@/lib/logger";
import type { FileConnectorConfig } from "@/core/types";

const router = Router();

// ── List all connectors ─────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  try {
    const connectors = await connectionManager.listConnectors();
    return res.json({ connectors });
  } catch (error) {
    logger.error({ error }, "Failed to list connectors");
    return res.status(500).json({ error: "Failed to list connectors" });
  }
});

// ── Get single connector ────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const config = await connectionManager.getConfig(req.params.id);
    if (!config) return res.status(404).json({ error: "Connector not found" });
    return res.json(config);
  } catch (error) {
    logger.error({ error }, "Failed to get connector");
    return res.status(500).json({ error: "Failed to get connector" });
  }
});

// ── Create connector ────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      id,
      name,
      filePath,
      fileBaseDir,
      sheetName,
      source,
      description,
      type,
      columnConfig,
      maxRows,
    } = req.body;

    if (!id || !name || !filePath) {
      return res
        .status(400)
        .json({ error: "id, name, and filePath are required" });
    }

    const existing = await connectionManager.getConfig(id);
    if (existing) {
      return res
        .status(409)
        .json({ error: `Connector "${id}" already exists` });
    }

    const now = new Date().toISOString();
    const ext = filePath.toLowerCase();
    const config: FileConnectorConfig = {
      id,
      name,
      type:
        type ||
        (ext.endsWith(".xlsx") || ext.endsWith(".xls") ? "xlsx" : "csv"),
      filePath,
      fileBaseDir: fileBaseDir || undefined,
      sheetName: sheetName || undefined,
      source: source || "default",
      description: description || "",
      columnConfig: columnConfig || undefined,
      maxRows: maxRows || 10000,
      createdAt: now,
      updatedAt: now,
    };

    await connectionManager.setConfig(config);
    logger.info({ connectorId: id, name, filePath }, "File connector created");
    return res.status(201).json(config);
  } catch (error) {
    logger.error({ error }, "Failed to create connector");
    return res.status(500).json({ error: "Failed to create connector" });
  }
});

// ── Update connector ────────────────────────────────────────────────
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const connectorId = req.params.id;
    const existing = await connectionManager.getConfig(connectorId);
    if (!existing)
      return res.status(404).json({ error: "Connector not found" });

    const updated: FileConnectorConfig = {
      ...existing,
      ...req.body,
      id: connectorId,
      updatedAt: new Date().toISOString(),
    };

    await connectionManager.setConfig(updated);
    logger.info(
      { connectorId, updatedFields: Object.keys(req.body) },
      "Connector updated",
    );
    return res.json(updated);
  } catch (error) {
    logger.error({ error }, "Failed to update connector");
    return res.status(500).json({ error: "Failed to update connector" });
  }
});

// ── Delete connector ────────────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const connectorId = req.params.id;
    const existing = await connectionManager.getConfig(connectorId);
    if (!existing)
      return res.status(404).json({ error: "Connector not found" });

    await connectionManager.removeConfig(connectorId);
    logger.info({ connectorId }, "Connector deleted");
    return res.json({ success: true, deletedConnectorId: connectorId });
  } catch (error) {
    logger.error({ error }, "Failed to delete connector");
    return res.status(500).json({ error: "Failed to delete connector" });
  }
});

// ── Test connection (validate file) ─────────────────────────────────
router.post("/:id/test", async (req: Request, res: Response) => {
  try {
    const status = await connectionManager.testConnection(req.params.id);
    return res.json(status);
  } catch (error) {
    logger.error({ error }, "Failed to test connection");
    return res.status(500).json({ error: "Failed to test connection" });
  }
});

// ── Schema introspection ────────────────────────────────────────────

router.get("/:id/schemas", async (_req: Request, res: Response) => {
  try {
    // File connectors don't have schemas — return the source group
    const connectors = await connectionManager.listConnectors();
    const groups = [...new Set(connectors.map((c) => c.source))];
    return res.json({ schemas: groups });
  } catch (error) {
    logger.error({ error }, "Failed to get schemas");
    return res.status(500).json({ error: "Failed to get schemas" });
  }
});

router.get("/:id/tables", async (req: Request, res: Response) => {
  try {
    const config = await connectionManager.getConfig(req.params.id);
    if (!config) return res.status(404).json({ error: "Connector not found" });
    return res.json({
      tables: [
        {
          name: config.name,
          type: "file" as const,
          filePath: config.filePath,
          fileType: config.type,
        },
      ],
    });
  } catch (error) {
    logger.error({ error }, "Failed to get tables");
    return res.status(500).json({ error: "Failed to get tables" });
  }
});

router.get("/:id/columns", async (req: Request, res: Response) => {
  try {
    const columns = await connectionManager.getColumns(req.params.id);
    return res.json({ columns });
  } catch (error) {
    logger.error({ error }, "Failed to get columns");
    return res.status(500).json({ error: "Failed to get columns" });
  }
});

// ── Preview query ───────────────────────────────────────────────────
router.post("/:id/preview", async (req: Request, res: Response) => {
  try {
    const pipeline = req.body.pipeline || {
      select: [],
      limit: req.body.maxRows || 100,
    };
    const result = await connectionManager.executeQuery(
      req.params.id,
      pipeline,
    );
    return res.json(result);
  } catch (error) {
    logger.error({ error }, "Failed to execute preview");
    return res
      .status(500)
      .json({
        error:
          error instanceof Error ? error.message : "Failed to execute query",
      });
  }
});

export const connectorsRouter = router;
export default router;
