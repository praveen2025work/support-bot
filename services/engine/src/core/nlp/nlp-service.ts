import { containerBootstrap } from "@nlpjs/core";
import { Nlp } from "@nlpjs/nlp";
import { LangEn } from "@nlpjs/lang-en";
import { LRUCache } from "lru-cache";
import { NLP_CONFIDENCE_THRESHOLD, NLP_DISAMBIG_FLOOR } from "../constants";
import { promises as fsPromises } from "fs";
import { NlpNotInitializedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { paths } from "@/lib/env-config";
import { extractDateEntities } from "./date-entity-extractor";
import { correctTypos, addToDictionary } from "./typo-corrector";
import { PatternMatcher } from "./pattern-matcher";
import { TfIdfIntentScorer } from "./tfidf-intent-scorer";
import { readTrainingJson } from "./training-files";
import { getGroupQueries } from "@/core/catalog/query-registry";
import type {
  ClassificationResult,
  DisambiguationCandidate,
  ExtractedEntity,
  IntentOverlap,
} from "../types";
import type { FuzzyMatcher } from "./fuzzy-matcher";

export { addToDictionary };

// Intents that should NOT match when the user is clearly asking a question
const SIMPLE_INTENTS = new Set(["farewell", "greeting"]);
const QUESTION_PATTERN =
  /^\s*(what|who|where|when|why|how|which|is|are|can|could|do|does|did|tell me)\b/i;
// Higher confidence bar for simple intents when text looks like a question
const SIMPLE_INTENT_QUESTION_THRESHOLD = 0.85;

// Ensemble weights: NLP.js 0.5, TF-IDF 0.3, Pattern 0.2
const ENSEMBLE_WEIGHT_NLP = 0.5;
const ENSEMBLE_WEIGHT_TFIDF = 0.3;
const ENSEMBLE_WEIGHT_PATTERN = 0.2;

type CorpusIntentEntry = { intent: string; utterances: string[] };

export interface CorpusData extends Record<string, unknown> {
  data?: CorpusIntentEntry[];
}

export class NlpService {
  private nlp: InstanceType<typeof Nlp> | null = null;
  private fuzzyMatcher: FuzzyMatcher;
  private patternMatcher = new PatternMatcher();
  private tfidfScorer = new TfIdfIntentScorer();
  private initialized = false;
  private corpusFile: string | null;
  private cachedOverlaps: IntentOverlap[] = [];
  // Classification cache — avoids re-running NLP for identical user texts.
  // At 1500 req/min, many users ask similar/identical questions (e.g. "help",
  // "list queries"). Cache saves ~50ms per hit. 2000 entries × 2min TTL.
  private classificationCache = new LRUCache<string, ClassificationResult>({
    max: 2000,
    ttl: 2 * 60 * 1000,
  });

  private groupId: string;

  constructor(
    fuzzyMatcher: FuzzyMatcher,
    corpusFile?: string | null,
    groupId?: string,
  ) {
    this.fuzzyMatcher = fuzzyMatcher;
    this.corpusFile = corpusFile ?? null;
    this.groupId = groupId ?? "default";
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.fuzzyMatcher.init();

    const container = await containerBootstrap();
    container.use(Nlp);
    container.use(LangEn);

    this.nlp = container.get("nlp") as InstanceType<typeof Nlp>;
    this.nlp.settings.autoSave = false;

    // Always load base corpus first — ensures all groups share core intents/entities
    const corpusData = await readTrainingJson<CorpusData>("corpus.json");
    await this.nlp.addCorpus(corpusData);

    // Additionally load group-specific corpus for focused training (addCorpus merges additively)
    if (this.corpusFile) {
      const groupCorpus = await readTrainingJson<CorpusData>(
        "groups",
        this.corpusFile,
      );
      await this.nlp.addCorpus(groupCorpus);
    }

    // Dynamically sync query names from the API so newly-added queries are
    // recognized as `query_name` entities without needing manual corpus edits.
    await this.syncQueryEntities(corpusData);

    // Merge approved learning-loop utterances. Each line in
    // services/engine/data/learning/<group>/auto-learned.jsonl is an
    // AutoLearnedItem written when an admin resolves a review-queue item
    // (or when signal aggregation auto-promotes a phrase). Without this
    // pass, /api/admin/learning/retrain only invalidates the engine cache
    // — the next initialization re-reads only the static corpus and the
    // approved learnings never take effect.
    const learnedCount = await this.applyAutoLearned();
    if (learnedCount > 0) {
      logger.info(
        { groupId: this.groupId, learnedCount },
        "Applied auto-learned utterances to NLP corpus",
      );
    }

    await this.nlp.train();

    // Initialize TF-IDF scorer from corpus utterances
    try {
      const intentUtterances = new Map<string, string[]>();
      const dataEntries = corpusData.data || [];
      for (const entry of dataEntries) {
        intentUtterances.set(entry.intent, entry.utterances);
      }
      this.tfidfScorer.initialize(intentUtterances);
    } catch (err) {
      logger.warn(
        { err },
        "TF-IDF scorer initialization failed — ensemble will use NLP.js + pattern only",
      );
    }

    this.initialized = true;
    logger.info(
      { corpus: this.corpusFile ?? "base" },
      "NLP model trained and ready (ensemble: NLP.js + TF-IDF + Pattern)",
    );

    // Run intent overlap detection and log warnings
    this.cachedOverlaps = await this.detectOverlaps(corpusData);
    if (this.cachedOverlaps.length > 0) {
      logger.warn(
        { overlapCount: this.cachedOverlaps.length },
        "Intent overlap detection found potential issues",
      );
      for (const overlap of this.cachedOverlaps) {
        if (overlap.trainedIntent !== overlap.classifiedIntent) {
          logger.warn(
            {
              utterance: overlap.utterance,
              trained: overlap.trainedIntent,
              classified: overlap.classifiedIntent,
              confidence: overlap.confidence,
            },
            "Misclassified training utterance",
          );
        } else {
          logger.warn(
            {
              utterance: overlap.utterance,
              intent: overlap.trainedIntent,
              confidence: overlap.confidence,
              secondBest: overlap.secondBestIntent,
              secondBestConfidence: overlap.secondBestConfidence,
            },
            "Ambiguous training utterance — top-2 intents within 0.15",
          );
        }
      }
    } else {
      logger.info("Intent overlap detection: no issues found");
    }
  }

  async classify(
    text: string,
    hasQueryContext = false,
  ): Promise<ClassificationResult> {
    if (!this.nlp) throw new NlpNotInitializedError();

    // Apply typo correction before classification
    const typoResult = correctTypos(text);
    const processedText = typoResult.wasCorrected ? typoResult.corrected : text;
    if (typoResult.wasCorrected) {
      logger.debug(
        {
          original: text,
          corrected: processedText,
          corrections: typoResult.corrections,
        },
        "Typo correction applied before NLP classification",
      );
    }

    // Cache lookup — normalized lowercase key for case-insensitive matching
    const cacheKey = processedText.trim().toLowerCase();
    const cached = this.classificationCache.get(cacheKey);
    if (cached) {
      logger.debug({ text: cacheKey, intent: cached.intent }, "NLP cache hit");
      // Attach corrections even on cache hit so the response can show "Did you mean"
      if (typoResult.wasCorrected) {
        return { ...cached, corrections: typoResult.corrections };
      }
      return cached;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await this.nlp.process("en", processedText);

    // ---- Ensemble voting: combine NLP.js + TF-IDF + Pattern scores ----
    const intentScores = new Map<string, number>();

    // 1. NLP.js scores (weight 0.5)
    const nlpClassifications: Array<{ intent: string; score: number }> =
      result.classifications || [];
    for (const cls of nlpClassifications.slice(0, 10)) {
      if (cls.intent && cls.intent !== "None") {
        intentScores.set(
          cls.intent,
          (intentScores.get(cls.intent) || 0) + cls.score * ENSEMBLE_WEIGHT_NLP,
        );
      }
    }

    // 2. TF-IDF scores (weight 0.3)
    const tfidfScores = this.tfidfScorer.score(processedText);
    for (const ts of tfidfScores) {
      intentScores.set(
        ts.intent,
        (intentScores.get(ts.intent) || 0) + ts.score * ENSEMBLE_WEIGHT_TFIDF,
      );
    }

    // 3. Pattern scores (weight 0.2)
    const patternMatches = this.patternMatcher.matchAll(processedText);
    for (const pm of patternMatches) {
      intentScores.set(
        pm.intent,
        (intentScores.get(pm.intent) || 0) +
          pm.confidence * ENSEMBLE_WEIGHT_PATTERN,
      );
    }

    // Sort by combined score
    const ensembleSorted = Array.from(intentScores.entries()).sort(
      ([, a], [, b]) => b - a,
    );
    const ensembleTop = ensembleSorted[0];

    // Determine source label for ensemble vs single-source
    const usedSources = [
      nlpClassifications.length > 0 ? "nlp" : null,
      tfidfScores.length > 0 ? "tfidf" : null,
      patternMatches.length > 0 ? "pattern" : null,
    ].filter(Boolean);
    const sourceLabel: ClassificationResult["source"] =
      usedSources.length > 1 ? "ensemble" : "nlp";

    // If ensemble has a confident result, use it; otherwise fall back to NLP.js single result
    const ensembleIntent = ensembleTop?.[0] || result.intent || "None";
    const ensembleScore = ensembleTop?.[1] || result.score || 0;

    // If ensemble total score is very low, check fuzzy
    if (
      ensembleScore < NLP_CONFIDENCE_THRESHOLD &&
      (result.intent === "None" || result.score < NLP_CONFIDENCE_THRESHOLD)
    ) {
      logger.debug(
        { text, ensembleScore, nlpScore: result.score },
        "Low ensemble confidence, trying fuzzy match",
      );
      const fuzzyResult = this.fuzzyMatcher.match(text);
      if (fuzzyResult) {
        const r: ClassificationResult = {
          intent: fuzzyResult.intent,
          confidence: fuzzyResult.score,
          entities: [],
          source: fuzzyResult.source,
          ...(typoResult.wasCorrected && {
            corrections: typoResult.corrections,
          }),
        };
        this.classificationCache.set(cacheKey, r);
        return r;
      }
    }

    // Guard: if text looks like a question but matched a simple intent
    // (farewell/greeting) at borderline confidence, demote to None
    if (
      SIMPLE_INTENTS.has(ensembleIntent) &&
      QUESTION_PATTERN.test(text) &&
      ensembleScore < SIMPLE_INTENT_QUESTION_THRESHOLD
    ) {
      logger.debug(
        { text, intent: ensembleIntent, score: ensembleScore },
        "Question-pattern detected with simple-intent — demoting to unknown",
      );
      const fuzzyResult = this.fuzzyMatcher.match(text);
      if (fuzzyResult) {
        const r: ClassificationResult = {
          intent: fuzzyResult.intent,
          confidence: fuzzyResult.score,
          entities: [],
          source: fuzzyResult.source,
          ...(typoResult.wasCorrected && {
            corrections: typoResult.corrections,
          }),
        };
        this.classificationCache.set(cacheKey, r);
        return r;
      }
      const r: ClassificationResult = {
        intent: "None",
        confidence: ensembleScore,
        entities: [],
        source: sourceLabel,
        ...(typoResult.wasCorrected && { corrections: typoResult.corrections }),
      };
      this.classificationCache.set(cacheKey, r);
      return r;
    }

    if (ensembleTop && ensembleScore >= NLP_CONFIDENCE_THRESHOLD) {
      logger.debug(
        {
          text: processedText,
          ensemble: ensembleSorted
            .slice(0, 3)
            .map(([i, s]) => `${i}:${s.toFixed(3)}`),
          source: sourceLabel,
        },
        "Ensemble classification result",
      );
    }

    const entities: ExtractedEntity[] = (result.entities || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => ({
        entity: e.entity,
        value: e.option || e.sourceText,
        resolution: e.resolution,
        start: e.start,
        end: e.end,
      }),
    );

    // Auto-detect date entities if NLP didn't find a time_period
    if (!entities.some((e) => e.entity === "time_period")) {
      const dateEntities = extractDateEntities(text);
      entities.push(...dateEntities);
    }

    let finalIntent = ensembleIntent;
    let finalScore = ensembleScore;

    // Context-aware boosting: when user has active query results, prefer follow-up
    // intents if they scored close to the top result. This prevents "group by status"
    // from being classified as query.execute when the user is working with data.
    if (hasQueryContext && finalIntent !== "None") {
      const followupIntents = new Set([
        "followup.group_by",
        "followup.sort",
        "followup.filter",
        "followup.summary",
        "followup.top_n",
        "followup.aggregation",
        "followup.data_lookup",
        // Analysis intents also get context-aware boosting
        "analysis.profile",
        "analysis.smart_summary",
        "analysis.correlation",
        "analysis.distribution",
        "analysis.anomaly",
        "analysis.trend",
        "analysis.duplicates",
        "analysis.missing",
        "analysis.cluster",
        "analysis.decision_tree",
        "analysis.forecast",
        "analysis.pca",
        "analysis.report",
      ]);

      // If already a follow-up intent, no boosting needed
      if (!followupIntents.has(finalIntent)) {
        const classifications: Array<{ intent: string; score: number }> =
          result.classifications || [];
        for (const cls of classifications) {
          if (
            followupIntents.has(cls.intent) &&
            cls.score >= finalScore - 0.2
          ) {
            logger.debug(
              {
                original: finalIntent,
                boosted: cls.intent,
                origScore: finalScore,
                boostScore: cls.score,
              },
              "Context-aware boost: preferring follow-up intent",
            );
            finalIntent = cls.intent;
            finalScore = cls.score;
            break;
          }
        }
      }
    }

    // Disambiguation band: score landed between [NLP_DISAMBIG_FLOOR, NLP_CONFIDENCE_THRESHOLD).
    // Surface top-3 candidates so the UI can render "Did you mean?" chips instead of guessing.
    // Only applies when context-aware boosting hasn't already promoted finalIntent above the
    // threshold (in that case we trust the context boost).
    let disambiguationCandidates: DisambiguationCandidate[] | undefined;
    if (
      finalScore >= NLP_DISAMBIG_FLOOR &&
      finalScore < NLP_CONFIDENCE_THRESHOLD &&
      finalIntent !== "None"
    ) {
      try {
        disambiguationCandidates = this.buildDisambiguationCandidates(
          ensembleSorted,
          entities,
        );
        if (disambiguationCandidates.length === 0) {
          disambiguationCandidates = undefined;
        } else {
          logger.debug(
            {
              text: processedText,
              candidates: disambiguationCandidates.map(
                (c) => `${c.intent}:${c.score.toFixed(3)}`,
              ),
            },
            "Disambiguation band — returning top-3 candidates",
          );
        }
      } catch (err) {
        // Never fail classification because we couldn't build candidates.
        logger.warn(
          { err },
          "Failed to build disambiguation candidates — continuing without",
        );
        disambiguationCandidates = undefined;
      }
    }

    const classificationResult: ClassificationResult = {
      intent: finalIntent,
      confidence: finalScore,
      entities,
      sentiment: result.sentiment
        ? {
            score: result.sentiment.score,
            comparative: result.sentiment.comparative,
            vote: result.sentiment.vote,
          }
        : undefined,
      source: sourceLabel,
      ...(typoResult.wasCorrected && { corrections: typoResult.corrections }),
      ...(disambiguationCandidates && { disambiguationCandidates }),
    };
    this.classificationCache.set(cacheKey, classificationResult);
    return classificationResult;
  }

  /**
   * Build the top-3 disambiguation candidates from the sorted ensemble scores.
   * When an entry's intent is `query.execute` and a `query_name` entity was
   * extracted, attach it as `queryName` so the UI can forceIntent that exact
   * query. Top-3 is the locked design (per design doc).
   */
  private buildDisambiguationCandidates(
    ensembleSorted: Array<[string, number]>,
    entities: ExtractedEntity[],
  ): DisambiguationCandidate[] {
    const queryNameEntity = entities.find((e) => e.entity === "query_name");
    const queryName = queryNameEntity?.value;
    const top3 = ensembleSorted.slice(0, 3);
    return top3.map(([intent, score]) => {
      const candidate: DisambiguationCandidate = { intent, score };
      // Only attach queryName when this candidate is itself an executable query intent.
      if (intent === "query.execute" && queryName) {
        candidate.queryName = queryName;
      }
      return candidate;
    });
  }

  /**
   * Diagnostic-only: returns per-scorer raw scores BEFORE ensemble
   * combination. Used by the threshold/weight calibration experiment
   * (B-2.0) to sweep ensemble parameters without re-running NLP per combo.
   * Skips cache, context-aware boosting, fuzzy fallback, and the simple-
   * intent question guard so the caller sees the raw signal each scorer
   * produced.
   */
  async classifyWithBreakdown(text: string): Promise<{
    text: string;
    nlpClassifications: Array<{ intent: string; score: number }>;
    tfidfScores: Array<{ intent: string; score: number }>;
    patternMatches: Array<{ intent: string; confidence: number }>;
  }> {
    if (!this.nlp) throw new NlpNotInitializedError();
    const typoResult = correctTypos(text);
    const processedText = typoResult.wasCorrected ? typoResult.corrected : text;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await this.nlp.process("en", processedText);
    const nlpClassifications: Array<{ intent: string; score: number }> = (
      result.classifications || []
    ).filter(
      (c: { intent: string; score: number }) => c.intent && c.intent !== "None",
    );
    const tfidfScores = this.tfidfScorer.score(processedText);
    const patternMatches = this.patternMatcher.matchAll(processedText);
    return {
      text: processedText,
      nlpClassifications,
      tfidfScores,
      patternMatches,
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /** Returns cached overlap warnings from the last training run. */
  getOverlaps(): IntentOverlap[] {
    return this.cachedOverlaps;
  }

  /**
   * Merge approved learning-loop utterances into the live NLP corpus.
   *
   * Reads `services/engine/data/learning/<groupId>/auto-learned.jsonl`,
   * groups entries by their assigned intent, and calls `nlp.addCorpus`
   * with a synthetic corpus chunk so the trainer picks them up alongside
   * the static corpus.json + group corpus. Idempotent — duplicate
   * utterances are de-duped by the trainer.
   *
   * Returns the number of utterances actually merged (0 if no file or
   * nothing to learn).
   */
  private async applyAutoLearned(): Promise<number> {
    if (!this.nlp) return 0;
    const path = paths.data.autoLearned(this.groupId);
    let raw: string;
    try {
      raw = await fsPromises.readFile(path, "utf-8");
    } catch {
      // Missing file is normal — no approved learnings yet.
      return 0;
    }
    const byIntent = new Map<string, Set<string>>();
    let total = 0;
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const item = JSON.parse(trimmed) as {
          intent?: unknown;
          utterance?: unknown;
        };
        if (typeof item.intent !== "string" || !item.intent) continue;
        if (typeof item.utterance !== "string" || !item.utterance.trim())
          continue;
        let set = byIntent.get(item.intent);
        if (!set) {
          set = new Set<string>();
          byIntent.set(item.intent, set);
        }
        if (!set.has(item.utterance)) {
          set.add(item.utterance);
          total += 1;
        }
      } catch {
        // Skip malformed lines silently — they're recorded but don't poison training.
      }
    }
    if (total === 0) return 0;
    await this.nlp.addCorpus({
      locale: "en",
      name: `auto-learned-${this.groupId}`,
      data: Array.from(byIntent.entries()).map(([intent, utterances]) => ({
        intent,
        utterances: Array.from(utterances),
        answers: [],
      })),
    });
    return total;
  }

  /**
   * Fetch all query names from the file-based per-group store and register any
   * that are not already in the corpus as `query_name` entity
   * options. This ensures newly added queries are recognized by the NLP without
   * needing manual corpus.json edits.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async syncQueryEntities(corpusData: any): Promise<void> {
    if (!this.nlp) return;

    try {
      // Collect query names already registered in the corpus
      const corpusQueryNames = new Set<string>();
      const entityOptions = corpusData?.entities?.query_name?.options;
      if (entityOptions && typeof entityOptions === "object") {
        for (const key of Object.keys(entityOptions)) {
          corpusQueryNames.add(key.toLowerCase());
        }
      }

      // Query definitions come from the file-based per-group store — the
      // group's own file already holds exactly its queries (environment-
      // agnostic, no db.json, no allowlist/source re-filtering needed).
      const queries = getGroupQueries(this.groupId);

      let addedCount = 0;
      for (const q of queries) {
        const name = q.name as string;
        if (!name) continue;

        if (!corpusQueryNames.has(name.toLowerCase())) {
          // Generate synonyms from the query name (replace underscores, add description words)
          const synonyms: string[] = [name];
          const readable = name.replace(/_/g, " ");
          if (readable !== name) synonyms.push(readable);
          if (q.description) {
            // Add first few meaningful words of description as a synonym
            const descWords = (q.description as string)
              .split(/\s+/)
              .slice(0, 4)
              .join(" ");
            if (descWords.length > 3) synonyms.push(descWords);
          }

          // Register as a named entity option in the NLP manager
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nlpAny = this.nlp as any;
          const manager = nlpAny.container?.get?.("ner") ?? nlpAny.ner;
          if (manager?.addRuleOptionTexts) {
            manager.addRuleOptionTexts("en", "query_name", name, synonyms);
          } else if (nlpAny.addNerRuleOptionTexts) {
            nlpAny.addNerRuleOptionTexts("en", "query_name", name, synonyms);
          }
          addedCount++;
        }
      }

      if (addedCount > 0) {
        logger.info(
          { addedCount, total: queries.length },
          "Synced dynamic query_name entities from the per-group store",
        );
      }
    } catch (error) {
      // Non-critical: if the per-group file is unreadable, corpus entities still work
      logger.warn(
        { error },
        "Could not sync dynamic query entities from the per-group store — using corpus entities only",
      );
    }
  }

  /**
   * Cross-classifies each training utterance against the trained model to detect:
   * 1. Utterances that classify to a DIFFERENT intent than their training intent
   * 2. Utterances where top-2 intent confidences are within 0.15 (ambiguous)
   */
  private async detectOverlaps(
    corpusData: CorpusData,
  ): Promise<IntentOverlap[]> {
    if (!this.nlp) return [];

    const overlaps: IntentOverlap[] = [];
    const dataEntries = corpusData.data || [];

    for (const entry of dataEntries) {
      const trainedIntent = entry.intent;

      for (const utterance of entry.utterances) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = await this.nlp.process("en", utterance);
        const classifiedIntent = result.intent || "None";
        const confidence = result.score || 0;

        // Extract the top-2 classifications from the NLP result
        const classifications: Array<{ intent: string; score: number }> =
          result.classifications || [];
        const secondBest =
          classifications.length >= 2 ? classifications[1] : undefined;

        const isMisclassified = classifiedIntent !== trainedIntent;
        const isAmbiguous =
          !isMisclassified &&
          secondBest != null &&
          confidence - secondBest.score < 0.15;

        if (isMisclassified || isAmbiguous) {
          overlaps.push({
            utterance,
            trainedIntent,
            classifiedIntent,
            confidence,
            secondBestIntent: secondBest?.intent,
            secondBestConfidence: secondBest?.score,
          });
        }
      }
    }

    return overlaps;
  }
}
