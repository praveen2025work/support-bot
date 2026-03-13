import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import { logger } from '@/lib/logger';

export interface TenantContext {
  groupId: string;
  requestId: string;
  platform: string;
  userId?: string;
  startTime: number;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function tenantContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const groupId = (req.body?.groupId || req.query?.groupId || 'default') as string;
  const platform = (req.body?.platform || req.query?.platform || 'web') as string;
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();

  const context: TenantContext = {
    groupId,
    requestId,
    platform,
    userId: req.body?.userId,
    startTime: Date.now(),
  };

  // Add request ID to response headers for tracing
  res.setHeader('x-request-id', requestId);

  tenantStorage.run(context, () => next());
}

// Helper to get current tenant context
export function getTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

// Create a child logger with tenant context
export function getTenantLogger() {
  const ctx = getTenantContext();
  if (ctx) {
    return logger.child({ groupId: ctx.groupId, requestId: ctx.requestId, platform: ctx.platform });
  }
  return logger;
}
