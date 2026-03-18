import { Router, Request, Response } from 'express';
import { preferencesStore } from '@/data/user-preferences';
import { logger } from '@/lib/logger';

export const dashboardsRouter = Router();

function getUserId(req: Request): string | null {
  return (req.query.userId as string) || (req.body?.userId as string) || null;
}

// GET /api/dashboards?userId= — list all dashboards
dashboardsRouter.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const dashboards = await preferencesStore.listDashboards(userId);
    const prefs = await preferencesStore.read(userId);
    return res.json({ dashboards, activeDashboardId: prefs.activeDashboardId });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to list dashboards');
    return res.status(500).json({ error: 'Failed to list dashboards' });
  }
});

// POST /api/dashboards — create dashboard
dashboardsRouter.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const dashboard = await preferencesStore.createDashboard(userId, { name });
    return res.status(201).json(dashboard);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to create dashboard');
    return res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

// GET /api/dashboards/:id?userId= — get single dashboard
dashboardsRouter.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const dashboard = await preferencesStore.getDashboard(userId, req.params.id);
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    return res.json(dashboard);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to get dashboard');
    return res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// PUT /api/dashboards/:id — update dashboard
dashboardsRouter.put('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const { name, cards, layouts } = req.body;
    const dashboard = await preferencesStore.updateDashboard(userId, req.params.id, { name, cards, layouts });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    return res.json(dashboard);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to update dashboard');
    return res.status(500).json({ error: 'Failed to update dashboard' });
  }
});

// DELETE /api/dashboards/:id?userId= — delete dashboard
dashboardsRouter.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const deleted = await preferencesStore.deleteDashboard(userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Dashboard not found' });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to delete dashboard');
    return res.status(500).json({ error: 'Failed to delete dashboard' });
  }
});

// PUT /api/dashboards/:id/layouts — save layout positions (drag/drop)
dashboardsRouter.put('/:id/layouts', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const { layouts } = req.body;
    if (!Array.isArray(layouts)) return res.status(400).json({ error: 'layouts array is required' });
    const dashboard = await preferencesStore.updateDashboardLayouts(userId, req.params.id, layouts);
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    return res.json(dashboard);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to update layouts');
    return res.status(500).json({ error: 'Failed to update layouts' });
  }
});

// POST /api/dashboards/:id/cards — add card
dashboardsRouter.post('/:id/cards', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const { queryName, groupId, label, defaultFilters, autoRun, eventLink } = req.body;
    if (!queryName || !groupId) return res.status(400).json({ error: 'queryName and groupId are required' });
    const card = await preferencesStore.addCardToDashboard(userId, req.params.id, {
      queryName,
      groupId,
      label: label || queryName,
      defaultFilters: defaultFilters || {},
      autoRun: autoRun ?? true,
      eventLink: eventLink || { mode: 'auto' },
    });
    if (!card) return res.status(404).json({ error: 'Dashboard not found' });
    return res.status(201).json(card);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to add card');
    return res.status(500).json({ error: 'Failed to add card' });
  }
});

// PUT /api/dashboards/:id/cards/:cardId — update card config
dashboardsRouter.put('/:id/cards/:cardId', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const card = await preferencesStore.updateCard(userId, req.params.id, req.params.cardId, req.body);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    return res.json(card);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to update card');
    return res.status(500).json({ error: 'Failed to update card' });
  }
});

// DELETE /api/dashboards/:id/cards/:cardId — remove card
dashboardsRouter.delete('/:id/cards/:cardId', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const deleted = await preferencesStore.removeCardFromDashboard(userId, req.params.id, req.params.cardId);
    if (!deleted) return res.status(404).json({ error: 'Card not found' });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to remove card');
    return res.status(500).json({ error: 'Failed to remove card' });
  }
});

// POST /api/dashboards/:id/migrate-favorites — import favorites as cards
dashboardsRouter.post('/:id/migrate-favorites', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const dashboard = await preferencesStore.migrateFavoritesToDashboard(userId, req.params.id);
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    return res.json(dashboard);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to migrate favorites');
    return res.status(500).json({ error: 'Failed to migrate favorites' });
  }
});
