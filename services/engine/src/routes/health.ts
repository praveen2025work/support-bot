import { Router, Request, Response } from 'express';
import fs from 'fs';
import { getEngine, getEngineCount, getInitializedGroups } from '@/lib/singleton';
import { logger } from '@/lib/logger';
import { DATA_DIR, INSTANCE_ID } from '@/lib/env-config';

export const healthRouter = Router();

// Liveness probe — lightweight, always returns ok if the process is running
healthRouter.get('/health', (_req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'chatbot-engine',
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
});

// Readiness probe — verifies that critical subsystems are operational
healthRouter.get('/health/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, boolean> = { nlp: false, dataDir: false };

  // Check NLP / engine initialization (don't trigger init — just peek)
  try {
    const engine = await getEngine('default');
    checks.nlp = engine.isInitialized();
  } catch (err) {
    logger.debug({ err }, 'Readiness check: NLP not ready');
  }

  // Check data directory is accessible (NAS mount check)
  try {
    await fs.promises.access(DATA_DIR, fs.constants.R_OK | fs.constants.W_OK);
    checks.dataDir = true;
  } catch (err) {
    logger.debug({ err }, 'Readiness check: data directory not accessible');
  }

  const ready = Object.values(checks).every(Boolean);
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    instanceId: INSTANCE_ID,
    checks,
    engines: getInitializedGroups(),
  });
});
