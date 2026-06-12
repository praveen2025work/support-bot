import { Router, Request, Response } from "express";
import fs from "fs";
import {
  getEngine,
  getEngineCount,
  getInitializedGroups,
} from "@/lib/singleton";
import { logger } from "@/lib/logger";
import { DATA_DIR, INSTANCE_ID } from "@/lib/env-config";
import { getAllHealth } from "@/core/sources/health-monitor";
import { isDraining } from "@/lib/lifecycle";

export const healthRouter = Router();

// Liveness probe — lightweight, always returns ok if the process is running.
// Deliberately ignores the drain flag: a draining instance is still alive
// and must not be restarted by an orchestrator, only taken out of rotation
// (that's what /health/ready signals).
healthRouter.get(
  ["/health/live", "/health"],
  (_req: Request, res: Response) => {
    const memUsage = process.memoryUsage();
    res.json({
      status: "ok",
      service: "chatbot-engine",
      instanceId: INSTANCE_ID,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
      },
      engines: getEngineCount(),
    });
  },
);

// Readiness probe — verifies that critical subsystems are operational.
//
// Returns 503 (load balancer drains traffic) when ANY essential
// subsystem is down:
//   - nlp:     engine couldn't initialize / NLP not trained yet
//   - dataDir: NAS / volume mount unreachable
//   - sources: ZERO upstream data sources reachable. A single source
//              flaking is acceptable (other groups may still work)
//              but if every configured baseUrl is unreachable, this
//              instance can't usefully serve traffic. Distinct from
//              the per-call DATA_SOURCE_UNAVAILABLE envelope: that's
//              "this request failed", readiness is "stop sending me
//              new requests."
healthRouter.get("/health/ready", async (_req: Request, res: Response) => {
  // During graceful-shutdown drain, report not-ready immediately so the
  // load balancer stops routing new traffic before we close connections.
  if (isDraining()) {
    return res.status(503).json({
      status: "draining",
      instanceId: INSTANCE_ID,
      checks: { nlp: false, dataDir: false, sources: false },
    });
  }

  const checks: Record<string, boolean> = {
    nlp: false,
    dataDir: false,
    sources: false,
  };

  // Check NLP / engine initialization (don't trigger init — just peek)
  try {
    const engine = await getEngine("default");
    checks.nlp = engine.isInitialized();
  } catch (err) {
    logger.debug({ err }, "Readiness check: NLP not ready");
  }

  // Check data directory is accessible (NAS mount check)
  try {
    await fs.promises.access(DATA_DIR, fs.constants.R_OK | fs.constants.W_OK);
    checks.dataDir = true;
  } catch (err) {
    logger.debug({ err }, "Readiness check: data directory not accessible");
  }

  // Source health: pass if at least one configured source is `ok`.
  // If the monitor hasn't been seeded yet (e.g. very early boot),
  // treat as pass — we don't fail readiness for a race condition.
  const sourceHealth = getAllHealth();
  const okSources = sourceHealth.filter((s) => s.status === "ok").length;
  checks.sources = sourceHealth.length === 0 || okSources > 0;

  const ready = Object.values(checks).every(Boolean);
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    instanceId: INSTANCE_ID,
    checks,
    engines: getInitializedGroups(),
    sources: {
      total: sourceHealth.length,
      ok: okSources,
      unreachable: sourceHealth.filter((s) => s.status === "unreachable")
        .length,
      unknown:
        sourceHealth.length -
        okSources -
        sourceHealth.filter((s) => s.status === "unreachable").length,
    },
  });
});
