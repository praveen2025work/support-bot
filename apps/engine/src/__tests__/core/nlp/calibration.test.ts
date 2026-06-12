import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  decide,
  aggregate,
  compositeScore,
  shouldAlertDrift,
  hashTestSet,
  WEIGHT_GRID,
  type Breakdown,
  type CalibrationRecord,
} from "@/core/nlp/calibration";

const w = WEIGHT_GRID[0]; // current (0.5/0.3/0.2)

function bd(intent: string, score: number): Breakdown {
  return {
    text: "x",
    nlpClassifications: [{ intent, score }],
    tfidfScores: [{ intent, score }],
    patternMatches: [{ intent, confidence: score }],
  };
}

describe("decide", () => {
  it("marks a clear top intent confident", () => {
    const d = decide(bd("greeting", 0.9), w, 0.5);
    expect(d.topIntent).toBe("greeting");
    expect(d.confident).toBe(true);
    expect(d.disambig).toBe(false);
  });

  it("is not confident when the top score is below threshold", () => {
    const d = decide(bd("greeting", 0.1), w, 0.5);
    expect(d.confident).toBe(false);
  });

  it("flags a near-tie as disambig", () => {
    const b: Breakdown = {
      text: "x",
      nlpClassifications: [
        { intent: "a", score: 0.8 },
        { intent: "b", score: 0.78 },
      ],
      tfidfScores: [],
      patternMatches: [],
    };
    const d = decide(b, w, 0.3);
    expect(d.disambig).toBe(true);
    expect(d.confident).toBe(false);
  });
});

describe("aggregate + compositeScore", () => {
  it("counts correct-confident positives and OOD false positives", () => {
    const decisions = [
      {
        q: { text: "", expected: "greeting", tag: "in_corpus" as const },
        d: decide(bd("greeting", 0.9), w, 0.5),
      },
      {
        q: { text: "", expected: null, tag: "ood" as const },
        d: decide(bd("greeting", 0.9), w, 0.5),
      },
    ];
    const m = aggregate(decisions);
    expect(m.positives.correctConfident).toBe(1);
    expect(m.oods.falseConfident).toBe(1);
    // 1 correct − 3 × 1 false-confident
    expect(compositeScore(m)).toBe(-2);
  });
});

describe("shouldAlertDrift", () => {
  const rec = (score: number, hash = "h1"): CalibrationRecord => ({
    timestamp: "t",
    testSetSize: 1,
    testSetHash: hash,
    best: { weights: "", threshold: 0, score: 0 },
    current: {
      weights: "",
      threshold: 0.5,
      correctConfident: 0,
      wrongConfident: 0,
      oodFalseConfident: 0,
      posTotal: 0,
      oodTotal: 0,
      compositeScore: score,
    },
  });

  it("does not alert without a previous run", () => {
    expect(shouldAlertDrift(rec(10), undefined, 2).alert).toBe(false);
  });

  it("does not alert when the test set changed", () => {
    expect(shouldAlertDrift(rec(10, "h1"), rec(0, "h2"), 2).alert).toBe(false);
  });

  it("alerts when drift exceeds the threshold", () => {
    const r = shouldAlertDrift(rec(10), rec(5), 2);
    expect(r.drift).toBe(5);
    expect(r.alert).toBe(true);
  });

  it("does not alert when drift is within the threshold", () => {
    expect(shouldAlertDrift(rec(10), rec(9), 2).alert).toBe(false);
  });
});

describe("hashTestSet", () => {
  it("is deterministic and content-sensitive", () => {
    expect(hashTestSet()).toBe(hashTestSet());
    expect(hashTestSet([{ text: "a", expected: null, tag: "ood" }])).not.toBe(
      hashTestSet(),
    );
  });
});
