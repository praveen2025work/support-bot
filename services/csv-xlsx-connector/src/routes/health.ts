import { Router, Request, Response } from "express";
import { CONNECTOR_TYPE } from "@/lib/env-config";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    type: CONNECTOR_TYPE,
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export const healthRouter = router;
export default router;
