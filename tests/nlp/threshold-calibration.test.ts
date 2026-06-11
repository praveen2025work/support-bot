/**
 * B-2.0 — NLP ensemble threshold/weight calibration experiment
 *
 * Sweeps ensemble weights (NLP.js, TF-IDF, Pattern) and confidence threshold
 * against a held-out test set drawn from the corpus, plus paraphrased queries
 * not in the corpus, plus deliberately out-of-domain queries.
 *
 * Output: a per-config scoreboard appended to
 * `tests/nlp/threshold-calibration-results.md`.
 *
 * Decision use: the design doc's "Did you mean?" UX (B-2 task #14) needs a
 * confidence threshold below which we surface candidates instead of guessing.
 * This experiment finds the (weights, threshold) combo that maximizes correct
 * confident answers while minimizing wrong confident answers.
 *
 * Running: `npm test -- tests/nlp/threshold-calibration.test.ts`
 *
 * The harness only writes to a results file; it never asserts a "correct"
 * config — calibration is an exploratory experiment, not a regression check.
 */

import { promises as fs } from "fs";
import { join } from "path";
import { NlpService } from "../../services/engine/src/core/nlp/nlp-service";
import { FuzzyMatcher } from "../../services/engine/src/core/nlp/fuzzy-matcher";

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CORPUS = require("../../services/engine/src/training/corpus.json");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FAQ = require("../../services/engine/src/training/faq.json");

jest.mock("@/training/corpus.json", () => CORPUS, { virtual: true });
jest.mock("@/training/faq.json", () => FAQ, { virtual: true });

// ---------------------------------------------------------------------------
// Test set — held-out queries categorized by source
// ---------------------------------------------------------------------------

interface TestQuery {
  text: string;
  /** Expected top-1 intent. `null` means "no intent should match confidently" (OOD). */
  expected: string | null;
  /** Provenance tag for analysis. */
  tag: "in_corpus" | "paraphrase" | "ood";
}

const TEST_QUERIES: TestQuery[] = [
  // ---- In-corpus (should classify correctly with high confidence) ----
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

  // ---- Paraphrased (likely to stress generalization) ----
  // These rephrase common pilot user queries in ways that aren't verbatim
  // utterances in corpus.json. They probe out-of-distribution generalization.
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

  // ---- Out-of-domain (should NOT match any intent confidently) ----
  // If an OOD query gets a high-confidence answer, that's a false positive
  // and pilot users will hit "wrong query ran" trust-erosion moments.
  { text: "what is the capital of france", expected: null, tag: "ood" },
  { text: "asdfghjkl qwerty", expected: null, tag: "ood" },
  { text: "tell me a joke", expected: null, tag: "ood" },
  { text: "do you like pizza", expected: null, tag: "ood" },
  { text: "the weather is nice today", expected: null, tag: "ood" },
];

// ---------------------------------------------------------------------------
// Sweep grid — 7 weight configs × 6 thresholds = 42 combinations
// ---------------------------------------------------------------------------

interface WeightConfig {
  label: string;
  nlp: number;
  tfidf: number;
  pattern: number;
}

const WEIGHT_GRID: WeightConfig[] = [
  { label: "current (0.5/0.3/0.2)", nlp: 0.5, tfidf: 0.3, pattern: 0.2 },
  { label: "nlp-heavy (0.7/0.2/0.1)", nlp: 0.7, tfidf: 0.2, pattern: 0.1 },
  { label: "nlp-dominant (0.6/0.2/0.2)", nlp: 0.6, tfidf: 0.2, pattern: 0.2 },
  { label: "tfidf-balanced (0.4/0.4/0.2)", nlp: 0.4, tfidf: 0.4, pattern: 0.2 },
  { label: "tfidf-heavy (0.3/0.5/0.2)", nlp: 0.3, tfidf: 0.5, pattern: 0.2 },
  { label: "pattern-boost (0.4/0.3/0.3)", nlp: 0.4, tfidf: 0.3, pattern: 0.3 },
  { label: "uniform (0.34/0.33/0.33)", nlp: 0.34, tfidf: 0.33, pattern: 0.33 },
];

const THRESHOLD_GRID = [0.3, 0.4, 0.5, 0.6, 0.65, 0.7];

// ---------------------------------------------------------------------------
// Per-query breakdown → ensemble combination at a given (weights, threshold)
// ---------------------------------------------------------------------------

interface Breakdown {
  text: string;
  nlpClassifications: Array<{ intent: string; score: number }>;
  tfidfScores: Array<{ intent: string; score: number }>;
  patternMatches: Array<{ intent: string; confidence: number }>;
}

interface Decision {
  topIntent: string | null;
  topScore: number;
  secondScore: number;
  /** True when topScore >= threshold AND no near-tie. */
  confident: boolean;
  /** True when top-2 scores within 20% of each other. Triggers disambiguation. */
  disambig: boolean;
}

function decide(b: Breakdown, w: WeightConfig, threshold: number): Decision {
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
  const sorted = Array.from(scores.entries()).sort(([, a], [, b]) => b - a);
  const top = sorted[0];
  const second = sorted[1];
  const topScore = top?.[1] ?? 0;
  const secondScore = second?.[1] ?? 0;
  // Disambig: top-2 within 20% AND both above a minimal floor of 0.3.
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

// ---------------------------------------------------------------------------
// Aggregate metrics for one (weights, threshold) cell
// ---------------------------------------------------------------------------

interface CellMetrics {
  /** In-corpus + paraphrase queries that should classify correctly. */
  positives: {
    total: number;
    correctConfident: number;
    correctDisambig: number;
    wrongConfident: number;
    below: number;
  };
  /** OOD queries that should NOT classify confidently. */
  oods: {
    total: number;
    falseConfident: number;
    correctDisambig: number;
    correctBelow: number;
  };
}

function aggregate(
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

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

jest.setTimeout(120_000);

describe("B-2.0 NLP ensemble calibration", () => {
  let nlp: NlpService;

  beforeAll(async () => {
    const fuzzy = new FuzzyMatcher(null);
    // NlpService(fuzzyMatcher, corpusFile?, groupId?) — omit groupId so it
    // defaults to "default". (Previously passed `[]`, a stale call that made
    // this.groupId an array and crashed path joining in applyAutoLearned.)
    nlp = new NlpService(fuzzy, null);
    await nlp.initialize();
  });

  it("sweeps weights × thresholds and writes a results scoreboard", async () => {
    // 1. Compute per-scorer breakdown for each query (one NLP call each).
    const breakdowns: Array<{ q: TestQuery; b: Breakdown }> = [];
    for (const q of TEST_QUERIES) {
      const b = await nlp.classifyWithBreakdown(q.text);
      breakdowns.push({ q, b });
    }

    // 2. For every (weights, threshold) combo, compute decisions and metrics.
    interface Row {
      weights: string;
      threshold: number;
      pos_total: number;
      pos_correct_confident: number;
      pos_correct_disambig: number;
      pos_wrong_confident: number;
      pos_below: number;
      ood_total: number;
      ood_false_confident: number;
      ood_correct_disambig: number;
      ood_correct_below: number;
      score: number;
    }
    const rows: Row[] = [];
    for (const w of WEIGHT_GRID) {
      for (const t of THRESHOLD_GRID) {
        const decisions = breakdowns.map(({ q, b }) => ({
          q,
          d: decide(b, w, t),
        }));
        const m = aggregate(decisions);
        // Composite score: reward correct confident answers AND correct OOD
        // rejection; penalize false confident answers heavily.
        const score =
          m.positives.correctConfident +
          0.5 * m.positives.correctDisambig +
          m.oods.correctBelow +
          m.oods.correctDisambig -
          2 * m.positives.wrongConfident -
          3 * m.oods.falseConfident;
        rows.push({
          weights: w.label,
          threshold: t,
          pos_total: m.positives.total,
          pos_correct_confident: m.positives.correctConfident,
          pos_correct_disambig: m.positives.correctDisambig,
          pos_wrong_confident: m.positives.wrongConfident,
          pos_below: m.positives.below,
          ood_total: m.oods.total,
          ood_false_confident: m.oods.falseConfident,
          ood_correct_disambig: m.oods.correctDisambig,
          ood_correct_below: m.oods.correctBelow,
          score,
        });
      }
    }

    // 3. Find the best 5 configs by composite score.
    const best = [...rows].sort((a, b) => b.score - a.score).slice(0, 5);

    // 4. Per-query detail at the CURRENT default config so we can spot
    //    individual classification problems.
    const currentConfig = WEIGHT_GRID[0];
    const currentThreshold = 0.65;
    const detailRows = breakdowns.map(({ q, b }) => {
      const d = decide(b, currentConfig, currentThreshold);
      return {
        text: q.text,
        tag: q.tag,
        expected: q.expected ?? "(none)",
        top: d.topIntent ?? "(none)",
        topScore: d.topScore.toFixed(3),
        second: d.secondScore.toFixed(3),
        verdict: d.confident
          ? d.topIntent === q.expected
            ? "✓ correct"
            : "✗ wrong (confident)"
          : d.disambig
            ? "? disambig"
            : "— below",
      };
    });

    // 5. Render the markdown report.
    const lines: string[] = [];
    lines.push("# B-2.0 NLP Ensemble Calibration — Results");
    lines.push("");
    lines.push(`Run: ${new Date().toISOString()}`);
    lines.push(
      `Test set: ${TEST_QUERIES.length} queries (${TEST_QUERIES.filter((q) => q.tag === "in_corpus").length} in-corpus, ${TEST_QUERIES.filter((q) => q.tag === "paraphrase").length} paraphrase, ${TEST_QUERIES.filter((q) => q.tag === "ood").length} OOD).`,
    );
    lines.push(
      `Sweep: ${WEIGHT_GRID.length} weight configs × ${THRESHOLD_GRID.length} thresholds = ${rows.length} combos.`,
    );
    lines.push("");
    lines.push(
      "Composite score = correct_confident + 0.5·correct_disambig + ood_correct_below + ood_correct_disambig − 2·pos_wrong_confident − 3·ood_false_confident.",
    );
    lines.push("Higher is better.");
    lines.push("");
    lines.push("## Top 5 configs");
    lines.push("");
    lines.push(
      "| Rank | Weights (NLP/TFIDF/Pattern) | Threshold | Pos correct (conf/disambig) | Pos wrong | Pos below | OOD false-conf | OOD below+disambig | Composite |",
    );
    lines.push("|---|---|---|---|---|---|---|---|---|");
    best.forEach((r, i) => {
      lines.push(
        `| ${i + 1} | ${r.weights} | ${r.threshold} | ${r.pos_correct_confident}/${r.pos_correct_disambig} of ${r.pos_total} | ${r.pos_wrong_confident} | ${r.pos_below} | ${r.ood_false_confident}/${r.ood_total} | ${r.ood_correct_below + r.ood_correct_disambig}/${r.ood_total} | ${r.score.toFixed(2)} |`,
      );
    });
    lines.push("");
    lines.push("## All combos");
    lines.push("");
    lines.push(
      "| Weights | Threshold | pos_conf | pos_disambig | pos_wrong | pos_below | ood_false | ood_below | ood_disambig | score |",
    );
    lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
    for (const r of rows) {
      lines.push(
        `| ${r.weights} | ${r.threshold} | ${r.pos_correct_confident} | ${r.pos_correct_disambig} | ${r.pos_wrong_confident} | ${r.pos_below} | ${r.ood_false_confident} | ${r.ood_correct_below} | ${r.ood_correct_disambig} | ${r.score.toFixed(2)} |`,
      );
    }
    lines.push("");
    lines.push(
      "## Per-query detail at current default (0.5/0.3/0.2 + threshold 0.65)",
    );
    lines.push("");
    lines.push("| Text | Tag | Expected | Top | Score | 2nd | Verdict |");
    lines.push("|---|---|---|---|---:|---:|---|");
    for (const r of detailRows) {
      lines.push(
        `| ${r.text} | ${r.tag} | ${r.expected} | ${r.top} | ${r.topScore} | ${r.second} | ${r.verdict} |`,
      );
    }
    lines.push("");

    const outPath = join(__dirname, "threshold-calibration-results.md");
    await fs.writeFile(outPath, lines.join("\n"), "utf-8");

    // Console summary so we see something even without opening the file.

    console.log(
      `\nB-2.0 calibration complete. Top config: ${best[0].weights} @ threshold=${best[0].threshold} (score=${best[0].score.toFixed(2)}).\nFull results: ${outPath}\n`,
    );

    expect(rows.length).toBe(WEIGHT_GRID.length * THRESHOLD_GRID.length);
    expect(best[0].score).toBeGreaterThan(0); // sanity: best config does something useful
  });
});
