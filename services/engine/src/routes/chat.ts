import { Router, Request, Response } from 'express';
import { getEngine } from '@/lib/singleton';
import { createAdapter } from '@/adapters/adapter-factory';
import { logger } from '@/lib/logger';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export const chatRouter = Router();

const LOGS_DIR = join(process.cwd(), 'data/logs');
const LOGS_PATH = join(LOGS_DIR, 'conversations.jsonl');

function logConversation(entry: Record<string, unknown>) {
  try {
    if (!existsSync(LOGS_DIR)) {
      mkdirSync(LOGS_DIR, { recursive: true });
    }
    if (!existsSync(LOGS_PATH)) {
      writeFileSync(LOGS_PATH, '', 'utf-8');
    }
    appendFileSync(LOGS_PATH, JSON.stringify(entry) + '\n', 'utf-8');
  } catch {
    // Non-blocking
  }
}

chatRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const platform = body.platform || 'web';
    const groupId = body.groupId || 'default';

    const adapter = createAdapter(platform);
    const message = await adapter.parseIncoming(body);

    if (!message) {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    // Pass feedback signals through to the learning service
    if (body.feedbackType) message.feedbackType = body.feedbackType;
    if (body.previousMessageText) message.previousMessageText = body.previousMessageText;

    const engine = getEngine(groupId);
    const explicitFilters = body.explicitFilters as Record<string, string> | undefined;
    const response = await engine.processMessage(message, explicitFilters);
    const formatted = await adapter.formatResponse(response);

    logConversation({
      timestamp: new Date().toISOString(),
      sessionId: message.sessionId,
      groupId,
      platform,
      userMessage: message.text,
      botResponse: response.text,
      intent: response.intent,
      confidence: response.confidence,
      executionMs: response.executionMs,
      hasRichContent: !!response.richContent,
    });

    return res.json(formatted);
  } catch (error) {
    const err = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    logger.error({ error: err }, 'Chat API error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});
