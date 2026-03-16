import { Router, Request, Response } from 'express';
import groupsRouter from './groups';
import queriesRouter from './queries';
import filtersRouter from './filters';
import { intentsRouter, entitiesRouter } from './intents';
import templatesRouter from './templates';
import usersRouter from './users';
import filesRouter from './files';
import learningRouter from './learning';
import { settingsRouter, logsRouter } from './settings';
import { auditRouter } from './audit';
import { schedulesRouter } from './schedules';
import { anomalyRouter } from './anomaly';
import { Role, isValidRole } from '@/lib/rbac';
import { requirePermission } from '@/middleware/rbac';

const router = Router();

// Auth middleware — when ENGINE_API_KEY is set, require it on all admin routes
const engineApiKey = process.env.ENGINE_API_KEY;
if (engineApiKey) {
  router.use((req: Request, res: Response, next) => {
    const provided = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (provided !== engineApiKey) {
      return res.status(401).json({ error: 'Unauthorized — valid API key required for admin access' });
    }
    next();
  });
}

// RBAC middleware — extract user role from X-User-Role header (set by the Next.js proxy)
// and attach it to req.userRole for downstream permission checks.
// Default to 'admin' when no role header is present (request already passed Next.js admin auth).
router.use((req: Request, _res: Response, next) => {
  const roleHeader = req.headers['x-user-role'] as string | undefined;
  if (roleHeader && isValidRole(roleHeader)) {
    (req as any).userRole = roleHeader as Role;
  } else {
    (req as any).userRole = 'admin' as Role;
  }
  next();
});

router.use('/groups', groupsRouter);
router.use('/queries', queriesRouter);
router.use('/filters', filtersRouter);
router.use('/intents', intentsRouter);
router.use('/entities', entitiesRouter);
router.use('/templates', templatesRouter);
router.use('/users', usersRouter);
router.use('/files', filesRouter);
router.use('/learning', learningRouter);
router.use('/settings', settingsRouter);
router.use('/logs', logsRouter);
router.use('/audit', auditRouter);
router.use('/schedules', schedulesRouter);
router.use('/anomaly', anomalyRouter);

export const adminRouter = router;
export default router;
