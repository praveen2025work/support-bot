import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fsp } from "fs";
import path from "path";
import os from "os";

// We need to mock the logger and other imports before importing LearningService
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/generate-id", () => ({
  generateId: () =>
    `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
}));

vi.mock("@/lib/singleton", () => ({
  invalidateEngine: vi.fn(),
}));

// Create a temp dir for each test
let tempDir: string;

vi.mock("@/lib/env-config", () => ({
  paths: {
    data: {
      learningDir: (groupId: string) => path.join(tempDir, groupId),
      interactions: (groupId: string) =>
        path.join(tempDir, groupId, "interactions.jsonl"),
      reviewQueue: (groupId: string) =>
        path.join(tempDir, groupId, "review-queue.jsonl"),
      autoLearned: (groupId: string) =>
        path.join(tempDir, groupId, "auto-learned.jsonl"),
      signalAggregates: (groupId: string) =>
        path.join(tempDir, groupId, "signal-aggregates.json"),
    },
  },
}));

// Import after mocks are set up
import { LearningService } from "../core/learning/learning-service";
import type { ClassificationResult } from "../core/types";

function makeClassification(
  overrides: Partial<ClassificationResult> = {},
): ClassificationResult {
  return {
    intent: "query.execute",
    confidence: 0.9,
    source: "nlp" as const,
    entities: {},
    ...overrides,
  } as ClassificationResult;
}

describe("LearningService", () => {
  let service: LearningService;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `learning-test-${Date.now()}`);
    await fsp.mkdir(tempDir, { recursive: true });
    service = new LearningService("test-group");
  });

  afterEach(async () => {
    try {
      await fsp.rm(tempDir, { recursive: true, force: true });
    } catch {
      // cleanup best effort
    }
  });

  it("logs an interaction", async () => {
    await service.logInteraction(makeClassification(), {
      text: "show revenue",
      sessionId: "sess-1",
    });

    const stats = await service.getStats();
    expect(stats.totalInteractions).toBe(1);
  });

  it("queues low-confidence classifications for review", async () => {
    await service.logInteraction(
      makeClassification({ confidence: 0.3, intent: "query.execute" }),
      { text: "show something", sessionId: "sess-1" },
    );

    const queue = await service.getReviewQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].userMessage).toBe("show something");
    expect(queue[0].status).toBe("pending");
  });

  it("does not queue None intent for review", async () => {
    await service.logInteraction(
      makeClassification({ confidence: 0.2, intent: "None" }),
      { text: "asdfgh", sessionId: "sess-1" },
    );

    const queue = await service.getReviewQueue();
    expect(queue.length).toBe(0);
  });

  it("returns empty review queue when no file exists", async () => {
    const queue = await service.getReviewQueue();
    expect(queue).toEqual([]);
  });

  it("returns empty auto-learned when no file exists", async () => {
    const items = await service.getAutoLearnedItems();
    expect(items).toEqual([]);
  });

  it("returns correct stats shape", async () => {
    const stats = await service.getStats();
    expect(stats).toHaveProperty("totalInteractions");
    expect(stats).toHaveProperty("pendingReview");
    expect(stats).toHaveProperty("autoLearned");
    expect(stats).toHaveProperty("resolvedByAdmin");
    expect(stats).toHaveProperty("confidenceDistribution");
    expect(stats).toHaveProperty("recentActivity");
    expect(stats.confidenceDistribution).toHaveLength(5);
    expect(stats.recentActivity).toHaveLength(7);
  });

  it("processes multiple interactions and tracks stats", async () => {
    for (let i = 0; i < 5; i++) {
      await service.logInteraction(makeClassification({ confidence: 0.85 }), {
        text: `message ${i}`,
        sessionId: "sess-1",
      });
    }

    const stats = await service.getStats();
    expect(stats.totalInteractions).toBe(5);
  });

  it("filters review queue by status", async () => {
    await service.logInteraction(makeClassification({ confidence: 0.3 }), {
      text: "low conf 1",
      sessionId: "sess-1",
    });
    await service.logInteraction(makeClassification({ confidence: 0.35 }), {
      text: "low conf 2",
      sessionId: "sess-1",
    });

    const pending = await service.getReviewQueue(50, "pending");
    expect(pending.length).toBe(2);

    const resolved = await service.getReviewQueue(50, "resolved");
    expect(resolved.length).toBe(0);
  });

  describe("disambig_click feedback (Lane F — correction-on-click loop)", () => {
    async function readAggregates(): Promise<
      Record<string, { intent: string; positive: number; negative: number }>
    > {
      const file = path.join(tempDir, "test-group", "signal-aggregates.json");
      try {
        const raw = await fsp.readFile(file, "utf-8");
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }

    it("keys the positive signal on previousMessageText, not the current chip label", async () => {
      // Simulate: user typed "show revenue numbers" → got disambig chips →
      // clicked "monthly_revenue". The chat request now carries:
      //   text             = "monthly_revenue"        (chip displayLabel)
      //   previousMessageText = "show revenue numbers" (the ambiguous original)
      //   feedbackType     = "disambig_click"
      //   forceIntent      = "monthly_revenue"
      // The corpus signal must learn (show revenue numbers → query.execute).
      await service.logInteraction(
        makeClassification({ intent: "query.execute", confidence: 1.0 }),
        {
          text: "monthly_revenue",
          sessionId: "sess-disambig-1",
          feedbackType: "disambig_click",
          previousMessageText: "show revenue numbers",
        },
      );

      const agg = await readAggregates();
      expect(agg).toHaveProperty("show revenue numbers");
      expect(agg["show revenue numbers"].intent).toBe("query.execute");
      expect(agg["show revenue numbers"].positive).toBe(1);
      // The chip label should NOT have an aggregate of its own — that
      // would pollute the corpus with the queryName as a "user said this"
      // mapping.
      expect(agg).not.toHaveProperty("monthly_revenue");
    });

    it("resets the aggregate intent when the chosen intent disagrees", async () => {
      // First someone clicked through "show revenue" → query.list (wrong, but
      // recorded). Then a different user types same thing and corrects to
      // query.execute. The aggregate should reset to the new intent rather
      // than blend signals.
      await service.logInteraction(
        makeClassification({ intent: "query.list", confidence: 1.0 }),
        {
          text: "queries_list",
          sessionId: "sess-disambig-2a",
          feedbackType: "disambig_click",
          previousMessageText: "show revenue",
        },
      );
      await service.logInteraction(
        makeClassification({ intent: "query.execute", confidence: 1.0 }),
        {
          text: "monthly_revenue",
          sessionId: "sess-disambig-2b",
          feedbackType: "disambig_click",
          previousMessageText: "show revenue",
        },
      );

      const agg = await readAggregates();
      expect(agg["show revenue"].intent).toBe("query.execute");
      expect(agg["show revenue"].positive).toBe(1); // reset, not 2
    });

    it("falls back to current text when previousMessageText is missing", async () => {
      // Defensive: a malformed/older client posts disambig_click without a
      // previousMessageText. We still record a positive signal — keyed on
      // the current text — rather than dropping the user's signal entirely.
      await service.logInteraction(
        makeClassification({ intent: "query.execute", confidence: 1.0 }),
        {
          text: "monthly_revenue",
          sessionId: "sess-disambig-3",
          feedbackType: "disambig_click",
        },
      );

      const agg = await readAggregates();
      expect(agg).toHaveProperty("monthly_revenue");
      expect(agg["monthly_revenue"].intent).toBe("query.execute");
      expect(agg["monthly_revenue"].positive).toBe(1);
    });

    it("accumulates positive signals across multiple corrections of the same utterance", async () => {
      // Three different sessions, same ambiguous text, same chosen chip.
      // Aggregate should reach positive=3 — that's how the corpus eventually
      // promotes the (text, intent) pair into the trained model.
      for (let i = 0; i < 3; i++) {
        await service.logInteraction(
          makeClassification({ intent: "query.execute", confidence: 1.0 }),
          {
            text: "monthly_revenue",
            sessionId: `sess-disambig-loop-${i}`,
            feedbackType: "disambig_click",
            previousMessageText: "show revenue numbers",
          },
        );
      }

      const agg = await readAggregates();
      expect(agg["show revenue numbers"].positive).toBe(3);
    });
  });
});
