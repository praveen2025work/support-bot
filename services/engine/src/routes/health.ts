import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getEngine } from '@/lib/singleton';
import { logger } from '@/lib/logger';

export const healthRouter = Router();

// Liveness probe — lightweight, always returns ok if the process is running
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'chatbot-engine',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness probe — verifies that critical subsystems are operational
healthRouter.get('/health/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, boolean> = { nlp: false, dataDir: false };

  // Check NLP / engine initialization
  try {
    const engine = getEngine('default');
    checks.nlp = engine.isInitialized();
  } catch (err) {
    logger.debug({ err }, 'Readiness check: NLP not ready');
  }

  // Check data directory is accessible
  try {
    await fs.promises.access(
      path.join(process.cwd(), 'data'),
      fs.constants.R_OK,
    );
    checks.dataDir = true;
  } catch (err) {
    logger.debug({ err }, 'Readiness check: data directory not accessible');
  }

  const ready = Object.values(checks).every(Boolean);
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    checks,
  });
});
