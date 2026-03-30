import { Router, Request, Response } from "express";
import path from "path";
import { WatchRuleService } from "../core/watch/watch-rule-service";

const router = Router();
const dataDir = path.resolve(__dirname, "../../data");
const watchRuleService = new WatchRuleService(dataDir);

// GET /api/watch/rules?groupId=default
router.get("/rules", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const rules = watchRuleService.listRules(groupId);
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error("[Watch] List rules error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to list watch rules" });
  }
});

// POST /api/watch/rules
router.post("/rules", (req: Request, res: Response) => {
  try {
    const { groupId = "default", ...input } = req.body as {
      groupId?: string;
      name: string;
      queryName: string;
      type: string;
      condition: Record<string, unknown>;
      cronExpression: string;
      channels: string[];
      recipients?: string[];
      owner: string;
      cooldownMinutes?: number;
    };

    if (
      !input.name ||
      !input.queryName ||
      !input.type ||
      !input.cronExpression
    ) {
      res
        .status(400)
        .json({
          success: false,
          error:
            "Missing required fields: name, queryName, type, cronExpression",
        });
      return;
    }

    const rule = watchRuleService.createRule(groupId, input);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    console.error("[Watch] Create rule error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create watch rule" });
  }
});

// PATCH /api/watch/rules/:id?groupId=default
router.patch("/rules/:id", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const ruleId = req.params.id;
    const updates = req.body as Record<string, unknown>;

    const updated = watchRuleService.updateRule(groupId, ruleId, updates);
    if (!updated) {
      res.status(404).json({ success: false, error: "Watch rule not found" });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Watch] Update rule error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update watch rule" });
  }
});

// DELETE /api/watch/rules/:id?groupId=default
router.delete("/rules/:id", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const ruleId = req.params.id;

    watchRuleService.deleteRule(groupId, ruleId);
    res.json({ success: true });
  } catch (error) {
    console.error("[Watch] Delete rule error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to delete watch rule" });
  }
});

// GET /api/watch/alerts?groupId=default&limit=50
router.get("/alerts", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const limit = parseInt((req.query.limit as string) || "50", 10);

    const alerts = watchRuleService.getAlerts(groupId, limit);
    const unreadCount = watchRuleService.getUnreadCount(groupId);

    res.json({ success: true, data: alerts, unreadCount });
  } catch (error) {
    console.error("[Watch] List alerts error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to list watch alerts" });
  }
});

// PATCH /api/watch/alerts/:id/read?groupId=default
router.patch("/alerts/:id/read", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const alertId = req.params.id;

    watchRuleService.markAlertRead(groupId, alertId);
    res.json({ success: true });
  } catch (error) {
    console.error("[Watch] Mark alert read error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to mark alert as read" });
  }
});

export default router;
