import { Router, Request, Response } from "express";
import { logger } from "@/lib/logger";
import { getAuditLog } from "@/lib/audit-logger";

const router = Router();

/** Flat shape the admin audit UI consumes. */
interface AuditView {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  resource: string;
  resourceType: string;
  details?: string;
  ip?: string;
}

// GET /api/admin/audit — read the canonical audit log (audit.jsonl, written by
// logAudit from every admin mutation) and map it to the flat view the UI
// expects. Previously this route read a separate audit-log.jsonl that nothing
// writes, so the trail always showed empty.
router.get("/", async (req: Request, res: Response) => {
  try {
    const raw = await getAuditLog();
    let entries: AuditView[] = raw.map((e, idx) => ({
      id: `${e.timestamp}-${e.resourceId ?? e.resource}-${idx}`,
      timestamp: e.timestamp,
      action: e.action,
      user: e.userId ?? "system",
      resourceType: e.resource,
      resource: e.resourceId ?? e.resource,
      details: e.details ? JSON.stringify(e.details) : undefined,
      ip: e.ip,
    }));

    const { action, user, search } = req.query;
    if (action) entries = entries.filter((e) => e.action === action);
    if (user) entries = entries.filter((e) => e.user === user);
    if (search) {
      const term = String(search).toLowerCase();
      entries = entries.filter(
        (e) =>
          e.resource.toLowerCase().includes(term) ||
          (e.details && e.details.toLowerCase().includes(term)) ||
          e.resourceType.toLowerCase().includes(term),
      );
    }

    res.json({ entries });
  } catch (error) {
    logger.error({ error }, "Failed to get audit log");
    res.status(500).json({ error: "Failed to read audit log" });
  }
});

export { router as auditRouter };
