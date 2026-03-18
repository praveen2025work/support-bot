import { preferencesStore } from '@/data/user-preferences';
import { sendEmail, renderDashboardEmail, isEmailConfigured } from '@/lib/email-service';
import { QueryService } from '@/core/api-connector/query-service';
import { ApiClient } from '@/core/api-connector/api-client';
import { getGroupConfig } from '@/config/group-config';
import { logger } from '@/lib/logger';

const CHECK_INTERVAL_MS = 60_000; // Check every minute
let intervalRef: ReturnType<typeof setInterval> | null = null;

/** Simple cron check: is the subscription due now? */
function isDue(cronExpression: string, lastSentAt?: string): boolean {
  const now = new Date();
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minuteStr, hourStr, , , dayOfWeekStr] = parts;

  // Check minute
  if (minuteStr !== '*') {
    const minute = parseInt(minuteStr, 10);
    if (now.getMinutes() !== minute) return false;
  }

  // Check hour
  if (hourStr !== '*') {
    const hour = parseInt(hourStr, 10);
    if (now.getHours() !== hour) return false;
  }

  // Check day of week (0=Sunday)
  if (dayOfWeekStr !== '*') {
    const days = dayOfWeekStr.split(',').flatMap((d) => {
      if (d.includes('-')) {
        const [start, end] = d.split('-').map(Number);
        const range: number[] = [];
        for (let i = start; i <= end; i++) range.push(i);
        return range;
      }
      return [parseInt(d, 10)];
    });
    if (!days.includes(now.getDay())) return false;
  }

  // Don't send again if already sent in this minute window
  if (lastSentAt) {
    const lastSent = new Date(lastSentAt);
    const diffMs = now.getTime() - lastSent.getTime();
    if (diffMs < CHECK_INTERVAL_MS) return false;
  }

  return true;
}

async function processSubscriptions(): Promise<void> {
  if (!isEmailConfigured()) return;

  try {
    const activeSubs = await preferencesStore.getAllActiveSubscriptions();

    for (const { userId, dashboardId, dashboardName, subscription, cards } of activeSubs) {
      if (!isDue(subscription.cronExpression, subscription.lastSentAt)) continue;

      logger.info({ userId, dashboardId, email: subscription.email }, 'Processing dashboard email subscription');

      try {
        // Execute all card queries
        const results = await Promise.all(
          cards.map(async (card) => {
            try {
              const groupConfig = getGroupConfig(card.groupId);
              const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
              const queryService = new QueryService(apiClient, groupConfig.sources);
              const execResult = await queryService.executeQuery(card.queryName, card.defaultFilters);

              if (execResult.apiResult) {
                return { label: card.label, queryName: card.queryName, data: execResult.apiResult.data as Record<string, unknown>[], rowCount: execResult.apiResult.rowCount, executionMs: execResult.durationMs };
              } else if (execResult.csvResult) {
                return { label: card.label, queryName: card.queryName, data: execResult.csvResult.rows as Record<string, unknown>[], headers: execResult.csvResult.headers, rowCount: execResult.csvResult.rowCount, executionMs: execResult.durationMs };
              }
              return { label: card.label, queryName: card.queryName, data: [], rowCount: 0 };
            } catch (err) {
              return { label: card.label, queryName: card.queryName, error: String(err) };
            }
          })
        );

        const html = renderDashboardEmail(dashboardName, results);
        const sent = await sendEmail(subscription.email, `Dashboard: ${dashboardName}`, html);

        if (sent) {
          await preferencesStore.updateDashboardSubscription(userId, dashboardId, subscription.id, {
            lastSentAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.error({ err, userId, dashboardId, subId: subscription.id }, 'Failed to process subscription');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Email scheduler error');
  }
}

export function startEmailScheduler(): void {
  if (intervalRef) return;
  if (!isEmailConfigured()) {
    logger.info('Email scheduler not started — SMTP not configured');
    return;
  }
  logger.info('Starting email scheduler (checking every 60s)');
  intervalRef = setInterval(processSubscriptions, CHECK_INTERVAL_MS);
}

export function stopEmailScheduler(): void {
  if (intervalRef) {
    clearInterval(intervalRef);
    intervalRef = null;
  }
}
