import { Router, Request, Response } from 'express';
import { getEngine } from '@/lib/singleton';
import { createAdapter } from '@/adapters/adapter-factory';
import { getTenantContext, getTenantLogger } from '@/middleware/tenant-context';
import { join } from 'path';
import { encryptLogEntry } from '@/lib/log-encryption';
import { AsyncLogWriter } from '@/lib/async-log-writer';

export const chatRouter = Router();

// Async buffered log writer — batches writes every 500ms or 50 entries.
// Replaces appendFileSync which blocked the event loop on every request.
const conversationLogger = new AsyncLogWriter(
  join(process.cwd(), 'data', 'logs', 'conversations.jsonl'),
  { flushIntervalMs: 500, maxBatchSize: 50, maxBufferSize: 10_000 }
);

function logConversation(entry: Record<string, unknown>) {
  try {
    conversationLogger.append(encryptLogEntry(JSON.stringify(entry)));
  } catch {
    // Non-blocking — never fail the chat request due to logging
  }
}

chatRouter.post('/', async (req: Request, res: Response) => {
  const log = getTenantLogger();
  const ctx = getTenantContext();

  try {
    const body = req.body;
    const groupId = ctx?.groupId || body.groupId || 'default';
    const platform = ctx?.platform || body.platform || 'web';

    const adapter = createAdapter(platform);
    const message = await adapter.parseIncoming(body);

    if (!message) {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    // Pass feedback signals through to the learning service
    if (body.feedbackType) message.feedbackType = body.feedbackType;
    if (body.previousMessageText) message.previousMessageText = body.previousMessageText;

    const engine = await getEngine(groupId);
    const explicitFilters = body.explicitFilters as Record<string, string> | undefined;

    // Forward auth-related headers for Windows Auth / BAM pass-through
    const incomingHeaders: Record<string, string> = {};
    if (req.headers['authorization']) {
      incomingHeaders['authorization'] = req.headers['authorization'] as string;
    }
    if (req.headers['cookie']) {
      incomingHeaders['cookie'] = req.headers['cookie'] as string;
    }

    const response = await engine.processMessage(
      message,
      explicitFilters,
      Object.keys(incomingHeaders).length > 0 ? incomingHeaders : undefined
    );
    const formatted = await adapter.formatResponse(response);

    logConversation({
      timestamp: new Date().toISOString(),
      sessionId: message.sessionId,
      groupId,
      platform,
      requestId: ctx?.requestId,
      userMessage: message.text,
      botResponse: response.text,
      intent: response.intent,
      confidence: response.confidence,
      executionMs: response.executionMs,
      hasRichContent: !!response.richContent,
    });

    const elapsed = ctx ? Date.now() - ctx.startTime : undefined;
    log.info({ sessionId: message.sessionId, intent: response.intent, executionMs: elapsed }, 'Chat request completed');

    return res.json(formatted);
  } catch (error) {
    const err = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    log.error({ error: err }, 'Chat API error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});
