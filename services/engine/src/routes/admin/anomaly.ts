import { Router, Request, Response } from 'express';
import { getAnomalyDetector } from '@/core/anomaly/anomaly-detector';

const router = Router();

// GET /api/admin/anomaly/baselines
router.get('/baselines', async (req: Request, res: Response) => {
  const groupId = (req.query.groupId as string) || 'default';
  const queryName = req.query.queryName as string | undefined;
  const detector = getAnomalyDetector(groupId);
  await detector.ensureLoaded();
  const baselines = detector.getBaselines(queryName);
  return res.json({ baselines });
});

// GET /api/admin/anomaly/config
router.get('/config', async (req: Request, res: Response) => {
  const groupId = (req.query.groupId as string) || 'default';
  const detector = getAnomalyDetector(groupId);
  await detector.ensureLoaded();
  return res.json({ config: detector.getConfig() });
});

// PUT /api/admin/anomaly/config
router.put('/config', async (req: Request, res: Response) => {
  const groupId = (req.body.groupId as string) || 'default';
  const detector = getAnomalyDetector(groupId);
  await detector.ensureLoaded();
  await detector.setConfig(req.body.config || {});
  return res.json({ config: detector.getConfig() });
});

// POST /api/admin/anomaly/rebuild-baselines
router.post('/rebuild-baselines', async (req: Request, res: Response) => {
  const groupId = (req.body.groupId as string) || 'default';
  const detector = getAnomalyDetector(groupId);
  await detector.updateBaselines();
  return res.json({ success: true, baselines: detector.getBaselines() });
});

export const anomalyRouter = router;
export default router;
