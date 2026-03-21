import { Router, Request, Response } from "express";
import { getAnomalyDetector } from "@/core/anomaly/anomaly-detector";

const router = Router();

// GET /api/admin/anomaly/baselines
router.get("/baselines", async (req: Request, res: Response) => {
  const groupId = (req.query.groupId as string) || "default";
  const queryName = req.query.queryName as string | undefined;
  const detector = getAnomalyDetector(groupId);
  await detector.ensureLoaded();
  const baselines = detector.getBaselines(queryName);
  return res.json({ baselines });
});

// GET /api/admin/anomaly/config
router.get("/config", async (req: Request, res: Response) => {
  const groupId = (req.query.groupId as string) || "default";
  const detector = getAnomalyDetector(groupId);
  await detector.ensureLoaded();
  return res.json({ config: detector.getConfig() });
});

// PUT /api/admin/anomaly/config
router.put("/config", async (req: Request, res: Response) => {
  const groupId = (req.body.groupId as string) || "default";
  const detector = getAnomalyDetector(groupId);
  await detector.ensureLoaded();
  await detector.setConfig(req.body.config || {});
  return res.json({ config: detector.getConfig() });
});

// POST /api/admin/anomaly/rebuild-baselines
router.post("/rebuild-baselines", async (req: Request, res: Response) => {
  const groupId = (req.body.groupId as string) || "default";
  const detector = getAnomalyDetector(groupId);
  await detector.updateBaselines();
  return res.json({ success: true, baselines: detector.getBaselines() });
});

// ── Anomaly History ─────────────────────────────────────────────────

// GET /api/admin/anomaly/history
router.get("/history", async (req: Request, res: Response) => {
  const groupId = (req.query.groupId as string) || "default";
  const queryName = req.query.queryName as string | undefined;
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const detector = getAnomalyDetector(groupId);
  const events = await detector.getHistory(limit, queryName);
  return res.json({ events });
});

// POST /api/admin/anomaly/history/:id/acknowledge
router.post("/history/:id/acknowledge", async (req: Request, res: Response) => {
  const groupId = (req.body.groupId as string) || "default";
  const detector = getAnomalyDetector(groupId);
  const success = await detector.acknowledgeEvent(req.params.id);
  return res.json({ success });
});

// ── Business Rules ──────────────────────────────────────────────────

// GET /api/admin/anomaly/rules
router.get("/rules", async (req: Request, res: Response) => {
  const groupId = (req.query.groupId as string) || "default";
  const detector = getAnomalyDetector(groupId);
  await detector.ensureLoaded();
  return res.json({ rules: detector.getBusinessRules() });
});

// POST /api/admin/anomaly/rules
router.post("/rules", async (req: Request, res: Response) => {
  const groupId = (req.body.groupId as string) || "default";
  const { columnName, operator, threshold, severity, message, enabled } =
    req.body;
  if (!columnName || !operator || threshold === undefined) {
    return res
      .status(400)
      .json({ error: "columnName, operator, and threshold are required" });
  }
  const detector = getAnomalyDetector(groupId);
  await detector.ensureLoaded();
  const rule = detector.addBusinessRule({
    columnName,
    operator,
    threshold: Number(threshold),
    severity: severity || "warning",
    message: message || `${columnName} ${operator} ${threshold}`,
    enabled: enabled !== false,
  });
  return res.json({ rule });
});

// DELETE /api/admin/anomaly/rules/:id
router.delete("/rules/:id", async (req: Request, res: Response) => {
  const groupId = (req.query.groupId as string) || "default";
  const detector = getAnomalyDetector(groupId);
  await detector.ensureLoaded();
  const success = detector.removeBusinessRule(req.params.id);
  return res.json({ success });
});

export const anomalyRouter = router;
export default router;
