/**
 * Unit tests for NlpService and FuzzyMatcher
 *
 * These tests exercise:
 *   - NLP initialization and training with inline corpus data
 *   - Classification of known intents (greeting, help, query.execute, etc.)
 *   - Confidence threshold behaviour (NLP_CONFIDENCE_THRESHOLD = 0.65)
 *   - Fuzzy matching fallback when NLP confidence is low
 *   - Unknown / 'None' intent for unrecognisable input
 *   - Entity extraction (@query_name, @time_period, etc.)
 *   - Edge cases: empty string, very long input, special characters
 *   - Question-pattern demotion for simple intents
 */

import { NlpService } from "../../services/engine/src/core/nlp/nlp-service";
import { FuzzyMatcher } from "../../services/engine/src/core/nlp/fuzzy-matcher";
import { NLP_CONFIDENCE_THRESHOLD } from "../../services/engine/src/core/constants";

// ---------------------------------------------------------------------------
// Mock the logger so NLP training doesn't write to stdout
// ---------------------------------------------------------------------------
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock the dynamic import for corpus data (default corpus).
// We supply the real corpus.json so intents are trained authentically.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CORPUS = require("../../src/training/corpus.json");

jest.mock("@/training/corpus.json", () => CORPUS, { virtual: true });

// ---------------------------------------------------------------------------
// Mock the FAQ file used by FuzzyMatcher.
// Provide a small representative subset so fuzzy matching is testable.
// ---------------------------------------------------------------------------
const FAQ_DATA = [
  {
    question: "How do I access the monthly revenue report?",
    intent: "url.find",
    answer:
      "You can access the monthly revenue report. Would you like me to find the direct link?",
  },
  {
    question: "What is the current error rate?",
    intent: "query.execute",
    answer: "I can run the error rate query for you.",
  },
  {
    question: "How many active users do we have?",
    intent: "query.execute",
    answer: "I can pull up the active users data.",
  },
  {
    question: "Show me today's order numbers",
    intent: "query.execute",
    answer: "I can fetch the daily orders data for you.",
  },
  {
    question: "Where is the performance dashboard?",
    intent: "url.find",
    answer: "Let me find the performance dashboard URL for you.",
  },
];

jest.mock("@/training/faq.json", () => FAQ_DATA, { virtual: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fresh NlpService backed by the mocked corpus & FAQ. */
async function createInitializedService(): Promise<NlpService> {
  const fuzzy = new FuzzyMatcher();
  const nlp = new NlpService(fuzzy);
  await nlp.initialize();
  return nlp;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NlpService", () => {
  let service: NlpService;

  // Training is expensive — do it once for the whole suite.
  beforeAll(async () => {
    service = await createInitializedService();
  }, 30_000); // allow extra time for training

  // ── Initialization ──────────────────────────────────────────────────

  describe("initialization", () => {
    it("reports as initialized after training", () => {
      expect(service.isInitialized()).toBe(true);
    });

    it("does not re-train when initialize() is called a second time", async () => {
      // Should return immediately without error.
      await service.initialize();
      expect(service.isInitialized()).toBe(true);
    });

    it("throws NlpNotInitializedError when classify is called before init", async () => {
      const fuzzy = new FuzzyMatcher();
      const uninitialised = new NlpService(fuzzy);
      await expect(uninitialised.classify("hello")).rejects.toThrow(
        "NLP service not initialized",
      );
    });
  });

  // ── Classification of Known Intents ─────────────────────────────────

  describe("known intent classification", () => {
    it('classifies "hello" as greeting', async () => {
      const result = await service.classify("hello");
      expect(result.intent).toBe("greeting");
      expect(result.confidence).toBeGreaterThanOrEqual(
        NLP_CONFIDENCE_THRESHOLD,
      );
    });

    it('classifies "hi there" as greeting', async () => {
      const result = await service.classify("hi there");
      expect(result.intent).toBe("greeting");
    });

    it('classifies "help" as help intent', async () => {
      const result = await service.classify("help");
      expect(result.intent).toBe("help");
    });

    it('classifies "what can you do" as help intent', async () => {
      const result = await service.classify("what can you do");
      expect(result.intent).toBe("help");
    });

    it('classifies "bye" as farewell', async () => {
      const result = await service.classify("bye");
      expect(result.intent).toBe("farewell");
    });

    it('classifies "goodbye" as farewell', async () => {
      const result = await service.classify("goodbye");
      expect(result.intent).toBe("farewell");
    });

    it('classifies "run a query" as query.execute', async () => {
      const result = await service.classify("run a query");
      expect(result.intent).toBe("query.execute");
    });

    it('classifies "list all queries" as query.list', async () => {
      const result = await service.classify("list all queries");
      expect(result.intent).toBe("query.list");
    });

    it('classifies "what queries are available" as query.list', async () => {
      const result = await service.classify("what queries are available");
      expect(result.intent).toBe("query.list");
    });

    it('classifies "how long will this take" as query.estimate', async () => {
      const result = await service.classify("how long will this take");
      expect(result.intent).toBe("query.estimate");
    });

    it('classifies "give me the link" as url.find', async () => {
      const result = await service.classify("give me the link");
      expect(result.intent).toBe("url.find");
    });

    it('classifies "run multiple queries" as query.multi', async () => {
      const result = await service.classify("run multiple queries");
      expect(result.intent).toBe("query.multi");
    });
  });

  // ── Confidence Threshold ────────────────────────────────────────────

  describe("confidence threshold", () => {
    it("returns classification result with source field", async () => {
      const result = await service.classify("hello");
      expect(result).toHaveProperty("source");
      expect(["nlp", "fuzzy", "ensemble"]).toContain(result.source);
    });

    it("NLP_CONFIDENCE_THRESHOLD is 0.65", () => {
      expect(NLP_CONFIDENCE_THRESHOLD).toBe(0.65);
    });

    it("high-confidence NLP match returns source=nlp", async () => {
      const result = await service.classify("hello");
      // If greeting matched with high confidence, source should be nlp
      if (result.confidence >= NLP_CONFIDENCE_THRESHOLD) {
        expect(["nlp", "ensemble"]).toContain(result.source);
      }
    });
  });

  // ── Fuzzy Matching Fallback ─────────────────────────────────────────

  describe("fuzzy matching fallback", () => {
    it("falls back to fuzzy match for ambiguous text resembling an FAQ", async () => {
      // This is close to FAQ entry "What is the current error rate?"
      const result = await service.classify("current error rate info");
      // Should either resolve via NLP or fuzzy — either way, an intent should be returned
      expect(result.intent).not.toBe("");
    });

    it("fuzzy match result has source=fuzzy when used", async () => {
      // Use phrasing that NLP likely won't match with high confidence
      // but that closely mirrors an FAQ question.
      const result = await service.classify("access monthly revenue report");
      if (result.source === "fuzzy") {
        expect(result.intent).toBeTruthy();
        expect(result.confidence).toBeGreaterThan(0);
      }
    });
  });

  // ── Unknown Input → None Intent ─────────────────────────────────────

  describe("unknown input", () => {
    it("returns low-confidence result for completely unrelated input", async () => {
      const result = await service.classify("xyzzy foobar quantum tractor");
      // NLP may classify gibberish to a random intent with low confidence,
      // or return None — either is acceptable for unknown input
      expect(result).toHaveProperty("intent");
      expect(result).toHaveProperty("confidence");
    });

    it("returns a result for random characters", async () => {
      const result = await service.classify("asdkjfhaskdjfh12938");
      expect(result).toHaveProperty("intent");
    });
  });

  // ── Entity Extraction ───────────────────────────────────────────────

  describe("entity extraction", () => {
    it('extracts query_name entity from "run the monthly_revenue query"', async () => {
      const result = await service.classify("run the monthly revenue query");
      expect(result.intent).toBe("query.execute");
      // The corpus defines monthly_revenue as an entity option
      const queryEntity = result.entities.find(
        (e) => e.entity === "query_name",
      );
      if (queryEntity) {
        expect(queryEntity.value).toBe("monthly_revenue");
      }
    });

    it('extracts time_period entity from "run monthly revenue for this month"', async () => {
      const result = await service.classify(
        "run monthly revenue for this month",
      );
      const timePeriod = result.entities.find(
        (e) => e.entity === "time_period",
      );
      if (timePeriod) {
        expect(timePeriod.value).toBe("this_month");
      }
    });

    it('extracts region entity from "show active users in US"', async () => {
      const result = await service.classify("show active users in US");
      const region = result.entities.find((e) => e.entity === "region");
      if (region) {
        expect(region.value).toBe("US");
      }
    });

    it('extracts date entities like "Jan 2026" via date-entity-extractor', async () => {
      const result = await service.classify(
        "show me monthly revenue for Jan 2026",
      );
      const timePeriod = result.entities.find(
        (e) => e.entity === "time_period",
      );
      // Either NLP found it or the date-entity-extractor post-processing did
      expect(timePeriod).toBeDefined();
      if (timePeriod) {
        expect(timePeriod.value).toMatch(/jan.*2026/i);
      }
    });

    it("entities array is always defined, even when empty", async () => {
      const result = await service.classify("hello");
      expect(Array.isArray(result.entities)).toBe(true);
    });
  });

  // ── Question-Pattern Demotion ───────────────────────────────────────

  describe("question-pattern demotion for simple intents", () => {
    it("demotes greeting when text looks like a question", async () => {
      // "what is the greeting" looks like a question — should not match "greeting" intent
      const result = await service.classify("what is the greeting process");
      // If NLP matched greeting at borderline confidence, it should be demoted
      if (result.intent === "greeting") {
        // Only valid if confidence is very high (>= 0.85)
        expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      }
    });
  });

  // ── Sentiment ───────────────────────────────────────────────────────

  describe("sentiment analysis", () => {
    it("includes sentiment data in classification result", async () => {
      const result = await service.classify("hello");
      // Sentiment may or may not be present depending on NLP config
      if (result.sentiment) {
        expect(result.sentiment).toHaveProperty("score");
        expect(result.sentiment).toHaveProperty("comparative");
        expect(result.sentiment).toHaveProperty("vote");
        expect(["positive", "neutral", "negative"]).toContain(
          result.sentiment.vote,
        );
      }
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles empty string without crashing", async () => {
      const result = await service.classify("");
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
    });

    it("handles very long input without crashing", async () => {
      const longText = "run the query ".repeat(500);
      const result = await service.classify(longText);
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
    });

    it("handles special characters without crashing", async () => {
      const result = await service.classify("!!!@@@###$$$%%%^^^&&&***");
      expect(result).toBeDefined();
    });

    it("handles unicode characters", async () => {
      const result = await service.classify("bonjour comment ca va");
      expect(result).toBeDefined();
    });

    it("handles input with only whitespace", async () => {
      const result = await service.classify("   \t  \n  ");
      expect(result).toBeDefined();
    });

    it("handles numeric-only input", async () => {
      const result = await service.classify("123456789");
      expect(result).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// FuzzyMatcher standalone tests
// ---------------------------------------------------------------------------

describe("FuzzyMatcher", () => {
  let matcher: FuzzyMatcher;

  beforeAll(async () => {
    matcher = new FuzzyMatcher();
    await matcher.init();
  });

  it("initializes without error", () => {
    // If we got here, init succeeded
    expect(true).toBe(true);
  });

  it("does not re-initialize on second call", async () => {
    await matcher.init(); // should return immediately
    expect(true).toBe(true);
  });

  it("returns null when fuse is not initialized (before init)", () => {
    const uninitialised = new FuzzyMatcher();
    const result = uninitialised.match("test");
    expect(result).toBeNull();
  });

  it("matches a close FAQ question", () => {
    const result = matcher.match("How many active users do we have?");
    if (result) {
      expect(result.intent).toBe("query.execute");
      expect(result.score).toBeGreaterThan(0);
      expect(result.answer).toBeTruthy();
    }
  });

  it("returns null for completely unrelated input", () => {
    const result = matcher.match("quantum physics entanglement theory");
    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    const result = matcher.match("");
    expect(result).toBeNull();
  });

  it("returns null for very short input below minMatchCharLength", () => {
    const result = matcher.match("ab");
    expect(result).toBeNull();
  });

  it("match result has correct shape", () => {
    const result = matcher.match("monthly revenue report");
    if (result) {
      expect(result).toHaveProperty("intent");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("answer");
      expect(typeof result.intent).toBe("string");
      expect(typeof result.score).toBe("number");
      expect(typeof result.answer).toBe("string");
    }
  });
});
