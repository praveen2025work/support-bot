/**
 * NLP ensemble threshold/weight calibration — reusable engine module.
 *
 * Extracted from the one-shot experiment in tests/nlp/threshold-calibration.test.ts
 * so the scheduled runner AND the test exercise identical math (single source of
 * truth). The pure helpers (decide/aggregate/compositeScore/shouldAlertDrift)
 * are exported for cheap unit testing without booting the NLP pipeline.
 */
import { NlpService } from "./nlp-service";
import { FuzzyMatcher } from "./fuzzy-matcher";
import { NLP_CONFIDENCE_THRESHOLD } from "../constants";
import { logger } from "@/lib/logger";

export interface TestQuery {
  text: string;
  /** Expected top-1 intent. `null` means "should not match confidently" (OOD). */
  expected: string | null;
  tag: "in_corpus" | "paraphrase" | "ood";
}

/** Frozen held-out test set. Drift is only comparable within the same set. */
export const TEST_QUERIES: TestQuery[] = [
  // In-corpus
  { text: "hello", expected: "greeting", tag: "in_corpus" },
  { text: "good morning", expected: "greeting", tag: "in_corpus" },
  { text: "help", expected: "help", tag: "in_corpus" },
  { text: "what can you do?", expected: "help", tag: "in_corpus" },
  { text: "list queries", expected: "query.list", tag: "in_corpus" },
  {
    text: "show me available queries",
    expected: "query.list",
    tag: "in_corpus",
  },
  { text: "run monthly_revenue", expected: "query.execute", tag: "in_corpus" },
  { text: "execute active_users", expected: "query.execute", tag: "in_corpus" },
  { text: "find documentation", expected: "url.find", tag: "in_corpus" },
  { text: "where is the api docs", expected: "url.find", tag: "in_corpus" },
  { text: "goodbye", expected: "farewell", tag: "in_corpus" },
  { text: "bye", expected: "farewell", tag: "in_corpus" },
  {
    text: "estimate query duration",
    expected: "query.estimate",
    tag: "in_corpus",
  },
  { text: "search documents", expected: "document.ask", tag: "in_corpus" },
  { text: "list documents", expected: "document.list", tag: "in_corpus" },
  // Paraphrase
  {
    text: "show revenue numbers",
    expected: "query.execute",
    tag: "paraphrase",
  },
  {
    text: "how many active users do we have",
    expected: "query.execute",
    tag: "paraphrase",
  },
  {
    text: "i want to see the revenue this month",
    expected: "query.execute",
    tag: "paraphrase",
  },
  {
    text: "can you list out the queries i can run",
    expected: "query.list",
    tag: "paraphrase",
  },
  {
    text: "what queries are available to me",
    expected: "query.list",
    tag: "paraphrase",
  },
  { text: "i need help getting started", expected: "help", tag: "paraphrase" },
  { text: "how does this thing work", expected: "help", tag: "paraphrase" },
  {
    text: "where can i find the deployment runbook",
    expected: "url.find",
    tag: "paraphrase",
  },
  {
    text: "give me the link to the dashboard",
    expected: "url.find",
    tag: "paraphrase",
  },
  { text: "thanks talk later", expected: "farewell", tag: "paraphrase" },
  // Out-of-domain
  { text: "what is the capital of france", expected: null, tag: "ood" },
  { text: "asdfghjkl qwerty", expected: null, tag: "ood" },
  { text: "tell me a joke", expected: null, tag: "ood" },
  { text: "do you like pizza", expected: null, tag: "ood" },
  { text: "the weather is nice today", expected: null, tag: "ood" },
];

export interface WeightConfig {
  label: string;
  nlp: number;
  tfidf: number;
  pattern: number;
}

export const WEIGHT_GRID: WeightConfig[] = [
  { label: "current (0.5/0.3/0.2)", nlp: 0.5, tfidf: 0.3, pattern: 0.2 },
  { label: "nlp-heavy (0.7/0.2/0.1)", nlp: 0.7, tfidf: 0.2, pattern: 0.1 },
  { label: "nlp-dominant (0.6/0.2/0.2)", nlp: 0.6, tfidf: 0.2, pattern: 0.2 },
  { label: "tfidf-balanced (0.4/0.4/0.2)", nlp: 0.4, tfidf: 0.4, pattern: 0.2 },
  { label: "tfidf-heavy (0.3/0.5/0.2)", nlp: 0.3, tfidf: 0.5, pattern: 0.2 },
  { label: "pattern-boost (0.4/0.3/0.3)", nlp: 0.4, tfidf: 0.3, pattern: 0.3 },
  { label: "uniform (0.34/0.33/0.33)", nlp: 0.34, tfidf: 0.33, pattern: 0.33 },
];

export const THRESHOLD_GRID = [0.3, 0.4, 0.5, 0.6, 0.65, 0.7];

export interface Breakdown {
  text: string;
  nlpClassifications: Array<{ intent: string; score: number }>;
  tfidfScores: Array<{ intent: string; score: number }>;
  patternMatches: Array<{ intent: string; confidence: number }>;
}

export interface Decision {
  topIntent: string | null;
  topScore: number;
  secondScore: number;
  confident: boolean;
  disambig: boolean;
}

export function decide(
  b: Breakdown,
  w: WeightConfig,
  threshold: number,
): Decision {
  const scores = new Map<string, number>();
  for (const cls of b.nlpClassifications.slice(0, 10)) {
    scores.set(cls.intent, (scores.get(cls.intent) ?? 0) + cls.score * w.nlp);
  }
  for (const ts of b.tfidfScores) {
    scores.set(ts.intent, (scores.get(ts.intent) ?? 0) + ts.score * w.tfidf);
  }
  for (const pm of b.patternMatches) {
    scores.set(
      pm.intent,
      (scores.get(pm.intent) ?? 0) + pm.confidence * w.pattern,
    );
  }
  const sorted = Array.from(scores.entries()).sort(([, a], [, c]) => c - a);
  const top = sorted[0];
  const second = sorted[1];
  const topScore = top?.[1] ?? 0;
  const secondScore = second?.[1] ?? 0;
  const disambig =
    topScore > 0.3 &&
    secondScore > 0.3 &&
    secondScore / Math.max(topScore, 0.0001) >= 0.8;
  const confident = topScore >= threshold && !disambig;
  return {
    topIntent: top?.[0] ?? null,
    topScore,
    secondScore,
    confident,
    disambig,
  };
}

export interface CellMetrics {
  positives: {
    total: number;
    correctConfident: number;
    correctDisambig: number;
    wrongConfident: number;
    below: number;
  };
  oods: {
    total: number;
    falseConfident: number;
    correctDisambig: number;
    correctBelow: number;
  };
}

export function aggregate(
  decisions: Array<{ q: TestQuery; d: Decision }>,
): CellMetrics {
  const m: CellMetrics = {
    positives: {
      total: 0,
      correctConfident: 0,
      correctDisambig: 0,
      wrongConfident: 0,
      below: 0,
    },
    oods: { total: 0, falseConfident: 0, correctDisambig: 0, correctBelow: 0 },
  };
  for (const { q, d } of decisions) {
    if (q.expected !== null) {
      m.positives.total += 1;
      if (d.confident && d.topIntent === q.expected)
        m.positives.correctConfident += 1;
      else if (d.disambig && d.topIntent === q.expected)
        m.positives.correctDisambig += 1;
      else if (d.confident && d.topIntent !== q.expected)
        m.positives.wrongConfident += 1;
      else m.positives.below += 1;
    } else {
      m.oods.total += 1;
      if (d.confident) m.oods.falseConfident += 1;
      else if (d.disambig) m.oods.correctDisambig += 1;
      else m.oods.correctBelow += 1;
    }
  }
  return m;
}

/** Composite score: reward correct/OOD-reject, penalise confident mistakes. */
export function compositeScore(m: CellMetrics): number {
  return (
    m.positives.correctConfident +
    0.5 * m.positives.correctDisambig +
    m.oods.correctBelow +
    m.oods.correctDisambig -
    2 * m.positives.wrongConfident -
    3 * m.oods.falseConfident
  );
}

export interface CalibrationRecord {
  timestamp: string;
  testSetSize: number;
  testSetHash: string;
  best: { weights: string; threshold: number; score: number };
  current: {
    weights: string;
    threshold: number;
    correctConfident: number;
    wrongConfident: number;
    oodFalseConfident: number;
    posTotal: number;
    oodTotal: number;
    compositeScore: number;
  };
}

/** Stable djb2 hash so drift is only compared within an identical test set. */
export function hashTestSet(queries: TestQuery[] = TEST_QUERIES): string {
  const json = JSON.stringify(queries);
  let h = 5381;
  for (let i = 0; i < json.length; i++) {
    h = (h * 33) ^ json.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

/**
 * Decide whether the latest calibration drifted enough from the previous run to
 * alert. Returns no-alert when there's no prior run or the test set changed.
 */
export function shouldAlertDrift(
  latest: CalibrationRecord,
  previous: CalibrationRecord | undefined,
  threshold: number,
): { alert: boolean; drift: number } {
  if (!previous || previous.testSetHash !== latest.testSetHash) {
    return { alert: false, drift: 0 };
  }
  const drift = Math.abs(
    latest.current.compositeScore - previous.current.compositeScore,
  );
  return { alert: drift > threshold, drift };
}

/**
 * Boot the NLP pipeline once, sweep the grid, and return a calibration record
 * capturing the best config + the metrics at the live production config. Heavy
 * (full NlpService init) — run on a schedule or on demand, not per request.
 */
export async function runCalibration(): Promise<CalibrationRecord> {
  const fuzzy = new FuzzyMatcher(null);
  const nlp = new NlpService(fuzzy, null);
  await nlp.initialize();

  const breakdowns: Array<{ q: TestQuery; b: Breakdown }> = [];
  for (const q of TEST_QUERIES) {
    breakdowns.push({ q, b: await nlp.classifyWithBreakdown(q.text) });
  }

  let best = { weights: "", threshold: 0, score: -Infinity };
  for (const w of WEIGHT_GRID) {
    for (const t of THRESHOLD_GRID) {
      const decisions = breakdowns.map(({ q, b }) => ({
        q,
        d: decide(b, w, t),
      }));
      const s = compositeScore(aggregate(decisions));
      if (s > best.score) best = { weights: w.label, threshold: t, score: s };
    }
  }

  const currentWeights = WEIGHT_GRID[0];
  const currentThreshold = NLP_CONFIDENCE_THRESHOLD;
  const currentDecisions = breakdowns.map(({ q, b }) => ({
    q,
    d: decide(b, currentWeights, currentThreshold),
  }));
  const m = aggregate(currentDecisions);

  const record: CalibrationRecord = {
    timestamp: new Date().toISOString(),
    testSetSize: TEST_QUERIES.length,
    testSetHash: hashTestSet(),
    best,
    current: {
      weights: currentWeights.label,
      threshold: currentThreshold,
      correctConfident: m.positives.correctConfident,
      wrongConfident: m.positives.wrongConfident,
      oodFalseConfident: m.oods.falseConfident,
      posTotal: m.positives.total,
      oodTotal: m.oods.total,
      compositeScore: compositeScore(m),
    },
  };
  logger.info(
    { best: record.best, current: record.current },
    "NLP calibration run complete",
  );
  return record;
}
