import { Router, Request, Response } from 'express';
import { preferencesStore } from '@/data/user-preferences';
import { sendEmail, renderDashboardEmail, isEmailConfigured } from '@/lib/email-service';
import { QueryService } from '@/core/api-connector/query-service';
import { ApiClient } from '@/core/api-connector/api-client';
import { getGroupConfig } from '@/config/group-config';
import { logger } from '@/lib/logger';

export const dashboardSubscriptionsRouter = Router({ mergeParams: true });

function getUserId(req: Request): string | null {
  return (req.query.userId as string) || (req.body?.userId as string) || null;
}

// GET /api/dashboards/:id/subscriptions
dashboardSubscriptionsRouter.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const dashboard = await preferencesStore.getDashboard(userId, req.params.id);
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    return res.json({ subscriptions: dashboard.subscriptions || [], emailConfigured: isEmailConfigured() });
  } catch (err) {
    logger.error({ err }, 'Failed to list subscriptions');
    return res.status(500).json({ error: 'Failed to list subscriptions' });
  }
});

// POST /api/dashboards/:id/subscriptions
dashboardSubscriptionsRouter.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const { email, cronExpression } = req.body;
  if (!email || !cronExpression) return res.status(400).json({ error: 'email and cronExpression are required' });

  try {
    const sub = await preferencesStore.addDashboardSubscription(userId, req.params.id, { email, cronExpression });
    if (!sub) return res.status(404).json({ error: 'Dashboard not found' });
    return res.status(201).json(sub);
  } catch (err) {
    logger.error({ err }, 'Failed to add subscription');
    return res.status(500).json({ error: 'Failed to add subscription' });
  }
});

// PATCH /api/dashboards/:id/subscriptions/:subId
dashboardSubscriptionsRouter.patch('/:subId', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const sub = await preferencesStore.updateDashboardSubscription(userId, req.params.id, req.params.subId, req.body);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    return res.json(sub);
  } catch (err) {
    logger.error({ err }, 'Failed to update subscription');
    return res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// DELETE /api/dashboards/:id/subscriptions/:subId
dashboardSubscriptionsRouter.delete('/:subId', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const deleted = await preferencesStore.removeDashboardSubscription(userId, req.params.id, req.params.subId);
    if (!deleted) return res.status(404).json({ error: 'Subscription not found' });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to remove subscription');
    return res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

// POST /api/dashboards/:id/subscriptions/:subId/send-now — trigger immediate send
dashboardSubscriptionsRouter.post('/:subId/send-now', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const dashboard = await preferencesStore.getDashboard(userId, req.params.id);
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    const sub = (dashboard.subscriptions || []).find((s) => s.id === req.params.subId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    // Execute all card queries
    const results = await executeDashboardCards(dashboard);

    // Render & send
    const html = renderDashboardEmail(dashboard.name, results);
    const sent = await sendEmail(sub.email, `Dashboard: ${dashboard.name}`, html);

    if (sent) {
      await preferencesStore.updateDashboardSubscription(userId, req.params.id, sub.id, {
        lastSentAt: new Date().toISOString(),
      });
    }

    return res.json({ success: sent, cardCount: results.length });
  } catch (err) {
    logger.error({ err }, 'Failed to send dashboard email');
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

/** Execute all cards in a dashboard and return results for email rendering */
async function executeDashboardCards(dashboard: { cards: Array<{ queryName: string; groupId: string; label: string; defaultFilters: Record<string, string> }> }) {
  const results: Array<{ label: string; queryName: string; data?: Record<string, unknown>[]; headers?: string[]; rowCount?: number; executionMs?: number; error?: string }> = [];

  for (const card of dashboard.cards) {
    try {
      const groupConfig = getGroupConfig(card.groupId);
      const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
      const queryService = new QueryService(apiClient, groupConfig.sources);
      const execResult = await queryService.executeQuery(card.queryName, card.defaultFilters);

      if (execResult.apiResult) {
        results.push({
          label: card.label,
          queryName: card.queryName,
          data: execResult.apiResult.data as Record<string, unknown>[],
          rowCount: execResult.apiResult.rowCount,
          executionMs: execResult.durationMs,
        });
      } else if (execResult.csvResult) {
        results.push({
          label: card.label,
          queryName: card.queryName,
          data: execResult.csvResult.rows as Record<string, unknown>[],
          headers: execResult.csvResult.headers,
          rowCount: execResult.csvResult.rowCount,
          executionMs: execResult.durationMs,
        });
      } else {
        results.push({ label: card.label, queryName: card.queryName, data: [], rowCount: 0, executionMs: execResult.durationMs });
      }
    } catch (err) {
      results.push({ label: card.label, queryName: card.queryName, error: String(err) });
    }
  }

  return results;
}
