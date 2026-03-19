import { Router, Request, Response } from "express";
import { getEngine } from "@/lib/singleton";
import { logger } from "@/lib/logger";

export const sessionRouter = Router();

/**
 * POST /api/session/close
 *
 * Called by the UI via `navigator.sendBeacon` when the browser tab/window
 * closes. Removes the session from the file-based store so stale data
 * doesn't accumulate between cleanup sweeps.
 *
 * Body (JSON or sendBeacon text): { sessionId, userId, groupId? }
 */
sessionRouter.post("/close", async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, groupId } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const engine = await getEngine(groupId || "default");
    // Access the session manager through the engine's public method
    await engine.closeSession(sessionId, userId);

    logger.debug({ sessionId, userId }, "Session closed via beacon");
    return res.status(200).json({ ok: true });
  } catch (error) {
    // Never fail loudly — beacons are fire-and-forget
    logger.warn({ error }, "Session close failed");
    return res.status(200).json({ ok: true });
  }
});
