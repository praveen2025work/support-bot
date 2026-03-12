import { NextRequest, NextResponse } from 'next/server';
import { getEngine } from '@/lib/singleton';
import { createAdapter } from '@/adapters/adapter-factory';
import { logger } from '@/lib/logger';
import { appendFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const LOGS_PATH = join(process.cwd(), 'data/logs/conversations.jsonl');

function logConversation(entry: Record<string, unknown>) {
  try {
    if (!existsSync(LOGS_PATH)) {
      writeFileSync(LOGS_PATH, '', 'utf-8');
    }
    appendFileSync(LOGS_PATH, JSON.stringify(entry) + '\n', 'utf-8');
  } catch {
    // Non-blocking — don't fail chat for logging errors
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const platform = body.platform || 'web';
    const groupId = body.groupId || 'default';

    const adapter = createAdapter(platform);
    const message = await adapter.parseIncoming(body);

    if (!message) {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    const engine = getEngine(groupId);
    const explicitFilters = body.explicitFilters as Record<string, string> | undefined;
    const response = await engine.processMessage(message, explicitFilters);
    const formatted = await adapter.formatResponse(response);

    // Log the conversation exchange
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

    return NextResponse.json(formatted);
  } catch (error) {
    const err = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    logger.error({ error: err }, 'Chat API error');
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
