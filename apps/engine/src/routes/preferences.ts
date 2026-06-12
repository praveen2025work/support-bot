import { Router, Request, Response } from 'express';
import { preferencesStore } from '@/data/user-preferences';
import { logger } from '@/lib/logger';

export const preferencesRouter = Router();

function getUserId(req: Request): string | null {
  return (req.query.userId as string) || (req.body?.userId as string) || null;
}

// GET /api/preferences?userId=
preferencesRouter.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const prefs = await preferencesStore.read(userId);
    return res.json(prefs);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to read preferences');
    return res.status(500).json({ error: 'Failed to read preferences' });
  }
});

// PUT /api/preferences — update favorites/subscriptions order
preferencesRouter.put('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const prefs = await preferencesStore.update(userId, req.body);
    return res.json(prefs);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to update preferences');
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// POST /api/preferences/favorites
preferencesRouter.post('/favorites', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const { queryName, groupId, label, defaultFilters } = req.body;
  if (!queryName || !groupId) return res.status(400).json({ error: 'queryName and groupId are required' });
  try {
    const fav = await preferencesStore.addFavorite(userId, {
      queryName, groupId, label: label || queryName, defaultFilters: defaultFilters || {},
    });
    return res.status(201).json(fav);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to add favorite');
    return res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// DELETE /api/preferences/favorites/:id
preferencesRouter.delete('/favorites/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const removed = await preferencesStore.removeFavorite(userId, req.params.id);
    if (!removed) return res.status(404).json({ error: 'Favorite not found' });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to remove favorite');
    return res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// POST /api/preferences/subscriptions
preferencesRouter.post('/subscriptions', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const { queryName, groupId, label, defaultFilters, refreshOnLoad } = req.body;
  if (!queryName || !groupId) return res.status(400).json({ error: 'queryName and groupId are required' });
  try {
    const sub = await preferencesStore.addSubscription(userId, {
      queryName, groupId, label: label || queryName, defaultFilters: defaultFilters || {},
      refreshOnLoad: refreshOnLoad ?? true,
    });
    return res.status(201).json(sub);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to add subscription');
    return res.status(500).json({ error: 'Failed to add subscription' });
  }
});

// DELETE /api/preferences/subscriptions/:id
preferencesRouter.delete('/subscriptions/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const removed = await preferencesStore.removeSubscription(userId, req.params.id);
    if (!removed) return res.status(404).json({ error: 'Subscription not found' });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to remove subscription');
    return res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

// GET /api/preferences/recents?userId=
preferencesRouter.get('/recents', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const prefs = await preferencesStore.read(userId);
    return res.json({ recents: prefs.recentQueries });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to read recents');
    return res.status(500).json({ error: 'Failed to read recents' });
  }
});

// DELETE /api/preferences/recents
preferencesRouter.delete('/recents', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    await preferencesStore.clearRecents(userId);
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to clear recents');
    return res.status(500).json({ error: 'Failed to clear recents' });
  }
});
