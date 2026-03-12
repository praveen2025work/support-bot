import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const LOGS_PATH = join(process.cwd(), 'data/logs/conversations.jsonl');

interface LogEntry {
  timestamp: string;
  sessionId: string;
  groupId: string;
  platform: string;
  userMessage: string;
  botResponse: string;
  intent: string;
  confidence: number;
  executionMs?: number;
  hasRichContent?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    if (!existsSync(LOGS_PATH)) {
      return NextResponse.json({ logs: [], total: 0 });
    }

    const raw = readFileSync(LOGS_PATH, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const logs: LogEntry[] = lines.map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    // Apply filters
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group');
    const intent = searchParams.get('intent');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let filtered = logs;
    if (group) filtered = filtered.filter((l) => l.groupId === group);
    if (intent) filtered = filtered.filter((l) => l.intent === intent);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((l) =>
        l.userMessage.toLowerCase().includes(q) ||
        l.botResponse.toLowerCase().includes(q)
      );
    }

    // Most recent first, limited
    const result = filtered.reverse().slice(0, limit);

    // Aggregate intent distribution
    const intentCounts: Record<string, number> = {};
    for (const log of logs) {
      intentCounts[log.intent] = (intentCounts[log.intent] || 0) + 1;
    }

    return NextResponse.json({
      logs: result,
      total: logs.length,
      filtered: filtered.length,
      intentDistribution: intentCounts,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE — clear all logs
export async function DELETE() {
  try {
    writeFileSync(LOGS_PATH, '', 'utf-8');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
