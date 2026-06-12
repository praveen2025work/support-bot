import { Router, Request, Response } from "express";
import { logger } from "@/lib/logger";
import { requirePermission } from "@/middleware/rbac";
import { runCalibration } from "@/core/nlp/calibration";
import {
  appendCalibrationRecord,
  readCalibrationHistory,
} from "@/core/nlp/calibration-history";

const router = Router();

// GET /api/admin/calibration — calibration history, newest first.
router.get(
  "/",
  requirePermission("settings.read"),
  async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const history = await readCalibrationHistory(limit);
      return res.json({ history });
    } catch (error) {
      logger.error({ error }, "Failed to read calibration history");
      return res.status(500).json({ history: [] });
    }
  },
);

// POST /api/admin/calibration/run — run a calibration on demand and persist it.
router.post(
  "/run",
  requirePermission("settings.update"),
  async (_req: Request, res: Response) => {
    try {
      const record = await runCalibration();
      await appendCalibrationRecord(record);
      return res.status(201).json({ record });
    } catch (error) {
      logger.error({ error }, "Failed to run calibration");
      return res.status(500).json({ error: "Calibration failed" });
    }
  },
);

export { router as calibrationRouter };
