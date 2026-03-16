import { Router, Request, Response } from 'express';
import { listSchedules, createSchedule, updateSchedule, deleteSchedule } from '../../core/scheduler/schedule-service';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;
    const schedules = await listSchedules(userId);
    res.json({ schedules });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list schedules' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { queryName, groupId, userId, cronExpression, filters, label } = req.body;
    if (!queryName || !cronExpression || !userId) {
      res.status(400).json({ error: 'queryName, cronExpression, and userId are required' });
      return;
    }
    const schedule = await createSchedule({ queryName, groupId: groupId || 'default', userId, cronExpression, filters, label });
    res.status(201).json({ schedule });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const schedule = await updateSchedule(req.params.id, req.body);
    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }
    res.json({ schedule });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteSchedule(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

export { router as schedulesRouter };
