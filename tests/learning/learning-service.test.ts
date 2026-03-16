/**
 * Unit tests for LearningService
 *
 * These tests exercise:
 *   - Logging interactions to file (appendFile)
 *   - Queuing low-confidence items for review
 *   - Processing suggestion_click as positive signal
 *   - Processing rephrase as negative signal
 *   - Returning correct stats
 */

import { LearningService } from '../../services/engine/src/core/learning/learning-service';
import type { ClassificationResult } from '../../services/engine/src/core/types';
import { LEARNING_CONFIDENCE_THRESHOLD } from '../../services/engine/src/core/constants';

// ---------------------------------------------------------------------------
// Mock the logger so learning operations don't write to stdout
// ---------------------------------------------------------------------------
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock generate-id for deterministic IDs
let idCounter = 0;
jest.mock('@/lib/generate-id', () => ({
  generateId: () => `test-id-${++idCounter}`,
}));

// Mock singleton invalidation
jest.mock('@/lib/singleton', () => ({
  invalidateEngine: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock fs — keep all data in memory so we never touch disk
// ---------------------------------------------------------------------------
const fileStore: Record<string, string> = {};

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      access: jest.fn(async (p: string) => {
        if (fileStore[p] !== undefined) return;
        throw new Error('ENOENT');
      }),
      mkdir: jest.fn(async () => {}),
      appendFile: jest.fn(async (p: string, data: string) => {
        fileStore[p] = (fileStore[p] || '') + data;
      }),
      readFile: jest.fn(async (p: string) => {
        if (fileStore[p] !== undefined) return fileStore[p];
        throw new Error('ENOENT');
      }),
      writeFile: jest.fn(async (p: string, data: string) => {
        fileStore[p] = data;
      }),
    },
  };
});

// Mock env-config paths — use the actual file path because the root Jest config
// maps @/ to src/ (Next.js app), but env-config only exists in the engine tree.
jest.mock('../../services/engine/src/lib/env-config', () => ({
  paths: {
    data: {
      learningDir: (g: string) => `/mock/data/learning/${g}`,
      interactions: (g: string) => `/mock/data/learning/${g}/interactions.jsonl`,
      reviewQueue: (g: string) => `/mock/data/learning/${g}/review-queue.jsonl`,
      autoLearned: (g: string) => `/mock/data/learning/${g}/auto-learned.jsonl`,
      signalAggregates: (g: string) => `/mock/data/learning/${g}/signal-aggregates.json`,
    },
    training: {
      corpus: '/mock/training/corpus.json',
      groupCorpus: (g: string) => `/mock/training/groups/${g}/corpus.json`,
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClassification(overrides: Partial<ClassificationResult> = {}): ClassificationResult {
  return {
    intent: 'query.execute',
    confidence: 0.85,
    entities: [],
    source: 'nlp',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LearningService', () => {
  let service: LearningService;
  const GROUP = 'test-group';
  const interactionsPath = `/mock/data/learning/${GROUP}/interactions.jsonl`;
  const reviewQueuePath = `/mock/data/learning/${GROUP}/review-queue.jsonl`;
  const signalAggregatesPath = `/mock/data/learning/${GROUP}/signal-aggregates.json`;

  beforeEach(() => {
    // Clear all in-memory file data
    for (const key of Object.keys(fileStore)) {
      delete fileStore[key];
    }
    idCounter = 0;
    service = new LearningService(GROUP);
  });

  // ── logInteraction ──────────────────────────────────────────────────────

  describe('logInteraction', () => {
    it('appends an interaction entry to the interactions file', async () => {
      const classification = makeClassification();
      await service.logInteraction(classification, {
        text: 'show revenue',
        sessionId: 'sess-1',
      });

      expect(fileStore[interactionsPath]).toBeDefined();
      const lines = fileStore[interactionsPath].trim().split('\n');
      expect(lines).toHaveLength(1);

      const entry = JSON.parse(lines[0]);
      expect(entry.userMessage).toBe('show revenue');
      expect(entry.sessionId).toBe('sess-1');
      expect(entry.intent).toBe('query.execute');
      expect(entry.confidence).toBe(0.85);
      expect(entry.feedbackType).toBe('normal');
    });

    it('logs multiple interactions as separate lines', async () => {
      await service.logInteraction(makeClassification(), {
        text: 'message 1',
        sessionId: 'sess-1',
      });
      await service.logInteraction(makeClassification(), {
        text: 'message 2',
        sessionId: 'sess-1',
      });

      const lines = fileStore[interactionsPath].trim().split('\n');
      expect(lines).toHaveLength(2);
    });
  });

  // ── Review queue (low confidence) ─────────────────────────────────────

  describe('review queue', () => {
    it('queues low-confidence items for review', async () => {
      const lowConfidence = makeClassification({
        intent: 'greeting',
        confidence: LEARNING_CONFIDENCE_THRESHOLD - 0.1,
      });

      await service.logInteraction(lowConfidence, {
        text: 'helo there',
        sessionId: 'sess-2',
      });

      expect(fileStore[reviewQueuePath]).toBeDefined();
      const lines = fileStore[reviewQueuePath].trim().split('\n');
      expect(lines).toHaveLength(1);

      const item = JSON.parse(lines[0]);
      expect(item.userMessage).toBe('helo there');
      expect(item.status).toBe('pending');
      expect(item.detectedIntent).toBe('greeting');
    });

    it('does not queue high-confidence items', async () => {
      await service.logInteraction(makeClassification({ confidence: 0.9 }), {
        text: 'show revenue',
        sessionId: 'sess-3',
      });

      expect(fileStore[reviewQueuePath]).toBeUndefined();
    });

    it('does not queue "None" intent even at low confidence', async () => {
      await service.logInteraction(
        makeClassification({ intent: 'None', confidence: 0.1 }),
        { text: 'asdfghjkl', sessionId: 'sess-4' }
      );

      expect(fileStore[reviewQueuePath]).toBeUndefined();
    });
  });

  // ── Feedback signals ──────────────────────────────────────────────────

  describe('feedback signals', () => {
    it('processes suggestion_click as a positive signal', async () => {
      await service.logInteraction(makeClassification({ intent: 'query.execute' }), {
        text: 'show revenue',
        sessionId: 'sess-5',
        feedbackType: 'suggestion_click',
      });

      expect(fileStore[signalAggregatesPath]).toBeDefined();
      const aggregates = JSON.parse(fileStore[signalAggregatesPath]);
      const key = 'show revenue'; // normalized form
      expect(aggregates[key]).toBeDefined();
      expect(aggregates[key].positive).toBe(1);
      expect(aggregates[key].negative).toBe(0);
      expect(aggregates[key].intent).toBe('query.execute');
    });

    it('increments positive count on repeated suggestion_click', async () => {
      await service.logInteraction(makeClassification({ intent: 'query.execute' }), {
        text: 'show revenue',
        sessionId: 'sess-5a',
        feedbackType: 'suggestion_click',
      });
      await service.logInteraction(makeClassification({ intent: 'query.execute' }), {
        text: 'show revenue',
        sessionId: 'sess-5b',
        feedbackType: 'suggestion_click',
      });

      const aggregates = JSON.parse(fileStore[signalAggregatesPath]);
      expect(aggregates['show revenue'].positive).toBe(2);
    });

    it('processes rephrase as a negative signal on the previous message', async () => {
      // First, set up a positive signal so the aggregate exists
      await service.logInteraction(makeClassification({ intent: 'query.execute' }), {
        text: 'show reveneu',
        sessionId: 'sess-6a',
        feedbackType: 'suggestion_click',
      });

      // Now rephrase — this should penalize the previous message
      await service.logInteraction(makeClassification({ intent: 'query.execute' }), {
        text: 'show revenue',
        sessionId: 'sess-6',
        feedbackType: 'rephrase',
        previousMessageText: 'show reveneu',
      });

      const aggregates = JSON.parse(fileStore[signalAggregatesPath]);
      expect(aggregates['show reveneu'].negative).toBe(1);
    });

    it('does not create negative signal if no previousMessageText', async () => {
      await service.logInteraction(makeClassification(), {
        text: 'show revenue',
        sessionId: 'sess-7',
        feedbackType: 'rephrase',
        // no previousMessageText
      });

      // Signal aggregates should not be written (or be empty)
      if (fileStore[signalAggregatesPath]) {
        const aggregates = JSON.parse(fileStore[signalAggregatesPath]);
        const allNegative = Object.values(aggregates).some(
          (a: unknown) => (a as { negative: number }).negative > 0
        );
        expect(allNegative).toBe(false);
      }
    });
  });

  // ── getStats ──────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('returns correct stats for empty service', async () => {
      const stats = await service.getStats();

      expect(stats.totalInteractions).toBe(0);
      expect(stats.pendingReview).toBe(0);
      expect(stats.autoLearned).toBe(0);
      expect(stats.resolvedByAdmin).toBe(0);
      expect(stats.confidenceDistribution).toBeInstanceOf(Array);
      expect(stats.confidenceDistribution.length).toBe(5);
      expect(stats.recentActivity).toBeInstanceOf(Array);
      expect(stats.recentActivity.length).toBe(7);
    });

    it('returns correct totalInteractions count', async () => {
      await service.logInteraction(makeClassification(), {
        text: 'msg 1',
        sessionId: 's1',
      });
      await service.logInteraction(makeClassification(), {
        text: 'msg 2',
        sessionId: 's2',
      });

      const stats = await service.getStats();
      expect(stats.totalInteractions).toBe(2);
    });

    it('returns correct pendingReview count', async () => {
      // Add low-confidence interactions to trigger review queue
      await service.logInteraction(
        makeClassification({ confidence: 0.2, intent: 'help' }),
        { text: 'hlep', sessionId: 's1' }
      );
      await service.logInteraction(
        makeClassification({ confidence: 0.3, intent: 'greeting' }),
        { text: 'helo', sessionId: 's2' }
      );

      const stats = await service.getStats();
      expect(stats.pendingReview).toBe(2);
    });

    it('groups confidence into correct distribution buckets', async () => {
      await service.logInteraction(makeClassification({ confidence: 0.15 }), {
        text: 'a',
        sessionId: 's1',
      });
      await service.logInteraction(makeClassification({ confidence: 0.45 }), {
        text: 'b',
        sessionId: 's2',
      });
      await service.logInteraction(makeClassification({ confidence: 0.9 }), {
        text: 'c',
        sessionId: 's3',
      });

      const stats = await service.getStats();
      const dist = stats.confidenceDistribution;

      const low = dist.find((d) => d.bucket === '0-0.3');
      const mid = dist.find((d) => d.bucket === '0.3-0.5');
      const high = dist.find((d) => d.bucket === '0.8-1.0');

      expect(low?.count).toBe(1);
      expect(mid?.count).toBe(1);
      expect(high?.count).toBe(1);
    });
  });
});
