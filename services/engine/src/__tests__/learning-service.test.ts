import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';

// We need to mock the logger and other imports before importing LearningService
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/generate-id', () => ({
  generateId: () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
}));

vi.mock('@/lib/singleton', () => ({
  invalidateEngine: vi.fn(),
}));

// Create a temp dir for each test
let tempDir: string;

vi.mock('@/lib/env-config', () => ({
  paths: {
    data: {
      learningDir: (groupId: string) => path.join(tempDir, groupId),
      interactions: (groupId: string) => path.join(tempDir, groupId, 'interactions.jsonl'),
      reviewQueue: (groupId: string) => path.join(tempDir, groupId, 'review-queue.jsonl'),
      autoLearned: (groupId: string) => path.join(tempDir, groupId, 'auto-learned.jsonl'),
      signalAggregates: (groupId: string) => path.join(tempDir, groupId, 'signal-aggregates.json'),
    },
  },
}));

// Import after mocks are set up
import { LearningService } from '../core/learning/learning-service';
import type { ClassificationResult } from '../core/types';

function makeClassification(overrides: Partial<ClassificationResult> = {}): ClassificationResult {
  return {
    intent: 'query.execute',
    confidence: 0.9,
    source: 'nlp' as const,
    entities: {},
    ...overrides,
  } as ClassificationResult;
}

describe('LearningService', () => {
  let service: LearningService;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `learning-test-${Date.now()}`);
    await fsp.mkdir(tempDir, { recursive: true });
    service = new LearningService('test-group');
  });

  afterEach(async () => {
    try {
      await fsp.rm(tempDir, { recursive: true, force: true });
    } catch {
      // cleanup best effort
    }
  });

  it('logs an interaction', async () => {
    await service.logInteraction(makeClassification(), {
      text: 'show revenue',
      sessionId: 'sess-1',
    });

    const stats = await service.getStats();
    expect(stats.totalInteractions).toBe(1);
  });

  it('queues low-confidence classifications for review', async () => {
    await service.logInteraction(
      makeClassification({ confidence: 0.3, intent: 'query.execute' }),
      { text: 'show something', sessionId: 'sess-1' }
    );

    const queue = await service.getReviewQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].userMessage).toBe('show something');
    expect(queue[0].status).toBe('pending');
  });

  it('does not queue None intent for review', async () => {
    await service.logInteraction(
      makeClassification({ confidence: 0.2, intent: 'None' }),
      { text: 'asdfgh', sessionId: 'sess-1' }
    );

    const queue = await service.getReviewQueue();
    expect(queue.length).toBe(0);
  });

  it('returns empty review queue when no file exists', async () => {
    const queue = await service.getReviewQueue();
    expect(queue).toEqual([]);
  });

  it('returns empty auto-learned when no file exists', async () => {
    const items = await service.getAutoLearnedItems();
    expect(items).toEqual([]);
  });

  it('returns correct stats shape', async () => {
    const stats = await service.getStats();
    expect(stats).toHaveProperty('totalInteractions');
    expect(stats).toHaveProperty('pendingReview');
    expect(stats).toHaveProperty('autoLearned');
    expect(stats).toHaveProperty('resolvedByAdmin');
    expect(stats).toHaveProperty('confidenceDistribution');
    expect(stats).toHaveProperty('recentActivity');
    expect(stats.confidenceDistribution).toHaveLength(5);
    expect(stats.recentActivity).toHaveLength(7);
  });

  it('processes multiple interactions and tracks stats', async () => {
    for (let i = 0; i < 5; i++) {
      await service.logInteraction(
        makeClassification({ confidence: 0.85 }),
        { text: `message ${i}`, sessionId: 'sess-1' }
      );
    }

    const stats = await service.getStats();
    expect(stats.totalInteractions).toBe(5);
  });

  it('filters review queue by status', async () => {
    await service.logInteraction(
      makeClassification({ confidence: 0.3 }),
      { text: 'low conf 1', sessionId: 'sess-1' }
    );
    await service.logInteraction(
      makeClassification({ confidence: 0.35 }),
      { text: 'low conf 2', sessionId: 'sess-1' }
    );

    const pending = await service.getReviewQueue(50, 'pending');
    expect(pending.length).toBe(2);

    const resolved = await service.getReviewQueue(50, 'resolved');
    expect(resolved.length).toBe(0);
  });
});
