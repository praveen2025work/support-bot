import { Router, Request, Response } from 'express';
import { getLearningService } from '@/core/learning/learning-service';
import { invalidateEngine } from '@/lib/singleton';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit-logger';
import { requirePermission } from '@/middleware/rbac';

const router = Router();

router.get('/review', requirePermission('learning.manage'), async (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || 'default';
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const status = req.query.status as string | undefined;
    const svc = getLearningService(groupId);
    return res.json(await svc.getReviewQueue(limit, status));
  } catch (err) {
    logger.error({ error: err }, 'Failed to get review queue');
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/review/:id/resolve', requirePermission('learning.manage'), async (req: Request, res: Response) => {
  try {
    const { correctIntent } = req.body;
    const groupId = (req.body.groupId as string) || 'default';
    if (!correctIntent) return res.status(400).json({ error: 'correctIntent is required' });
    const svc = getLearningService(groupId);
    const success = await svc.resolveReviewItem(req.params.id, correctIntent);
    if (!success) return res.status(404).json({ error: 'Review item not found or already resolved' });
    await logAudit({ action: 'update', resource: 'learning-review', resourceId: req.params.id, groupId, details: { correctIntent }, ip: req.ip });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ error: err }, 'Failed to resolve review item');
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/review/:id/dismiss', requirePermission('learning.manage'), async (req: Request, res: Response) => {
  try {
    const groupId = (req.body.groupId as string) || 'default';
    const svc = getLearningService(groupId);
    const success = await svc.dismissReviewItem(req.params.id);
    if (!success) return res.status(404).json({ error: 'Review item not found or already resolved' });
    await logAudit({ action: 'update', resource: 'learning-review', resourceId: req.params.id, groupId, details: { dismissed: true }, ip: req.ip });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ error: err }, 'Failed to dismiss review item');
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/stats', requirePermission('learning.manage'), async (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || 'default';
    const svc = getLearningService(groupId);
    return res.json(await svc.getStats());
  } catch (err) {
    logger.error({ error: err }, 'Failed to get learning stats');
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/auto-learned', requirePermission('learning.manage'), async (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || 'default';
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const svc = getLearningService(groupId);
    return res.json(await svc.getAutoLearnedItems(limit));
  } catch (err) {
    logger.error({ error: err }, 'Failed to get auto-learned items');
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/retrain', requirePermission('learning.manage'), (req: Request, res: Response) => {
  try {
    const groupId = (req.body.groupId as string) || 'default';
    if (groupId === 'all') {
      const { invalidateAllEngines } = require('@/lib/singleton');
      invalidateAllEngines();
    } else {
      invalidateEngine(groupId);
    }
    logger.info({ groupId }, 'NLP retrain triggered');
    logAudit({ action: 'update', resource: 'learning-retrain', groupId, details: { groupId }, ip: req.ip });
    return res.json({ success: true, groupId });
  } catch (err) {
    logger.error({ error: err }, 'Failed to trigger retrain');
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/process-signals', requirePermission('learning.manage'), async (req: Request, res: Response) => {
  try {
    const groupId = (req.body.groupId as string) || 'default';
    const svc = getLearningService(groupId);
    const result = await svc.processSignals();
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ error: err }, 'Failed to process signals');
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
