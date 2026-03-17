import { containerBootstrap } from '@nlpjs/core';
import { Nlp } from '@nlpjs/nlp';
import { LangEn } from '@nlpjs/lang-en';
import { LRUCache } from 'lru-cache';
import { NLP_CONFIDENCE_THRESHOLD } from '../constants';
import { promises as fsPromises } from 'fs';
import { NlpNotInitializedError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { paths } from '@/lib/env-config';
import { extractDateEntities } from './date-entity-extractor';
import { correctTypos, addToDictionary } from './typo-corrector';
import type { ClassificationResult, ExtractedEntity, IntentOverlap } from '../types';
import type { FuzzyMatcher } from './fuzzy-matcher';

export { addToDictionary };

// Intents that should NOT match when the user is clearly asking a question
const SIMPLE_INTENTS = new Set(['farewell', 'greeting']);
const QUESTION_PATTERN = /^\s*(what|who|where|when|why|how|which|is|are|can|could|do|does|did|tell me)\b/i;
// Higher confidence bar for simple intents when text looks like a question
const SIMPLE_INTENT_QUESTION_THRESHOLD = 0.85;

export class NlpService {
  private nlp: InstanceType<typeof Nlp> | null = null;
  private fuzzyMatcher: FuzzyMatcher;
  private initialized = false;
  private corpusFile: string | null;
  private cachedOverlaps: IntentOverlap[] = [];
  private sources: string[];
  // Classification cache — avoids re-running NLP for identical user texts.
  // At 1500 req/min, many users ask similar/identical questions (e.g. "help",
  // "list queries"). Cache saves ~50ms per hit. 2000 entries × 2min TTL.
  private classificationCache = new LRUCache<string, ClassificationResult>({
    max: 2000,
    ttl: 2 * 60 * 1000,
  });

  constructor(fuzzyMatcher: FuzzyMatcher, corpusFile?: string | null, sources?: string[]) {
    this.fuzzyMatcher = fuzzyMatcher;
    this.corpusFile = corpusFile ?? null;
    this.sources = sources ?? [];
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.fuzzyMatcher.init();

    const container = await containerBootstrap();
    container.use(Nlp);
    container.use(LangEn);

    this.nlp = container.get('nlp') as InstanceType<typeof Nlp>;
    this.nlp.settings.autoSave = false;

    // Always load base corpus first — ensures all groups share core intents/entities
    const baseMod = await import('@/training/corpus.json');
    const corpusData = baseMod.default;
    await this.nlp.addCorpus(corpusData);

    // Additionally load group-specific corpus for focused training (addCorpus merges additively)
    if (this.corpusFile) {
      const groupMod = await import(`@/training/groups/${this.corpusFile}`);
      await this.nlp.addCorpus(groupMod.default);
    }

    // Dynamically sync query names from the API so newly-added queries are
    // recognized as `query_name` entities without needing manual corpus edits.
    await this.syncQueryEntities(corpusData);

    await this.nlp.train();

    this.initialized = true;
    logger.info({ corpus: this.corpusFile ?? 'base' }, 'NLP model trained and ready');

    // Run intent overlap detection and log warnings
    this.cachedOverlaps = await this.detectOverlaps(corpusData);
    if (this.cachedOverlaps.length > 0) {
      logger.warn(
        { overlapCount: this.cachedOverlaps.length },
        'Intent overlap detection found potential issues'
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
            'Misclassified training utterance'
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
            'Ambiguous training utterance — top-2 intents within 0.15'
          );
        }
      }
    } else {
      logger.info('Intent overlap detection: no issues found');
    }
  }

  async classify(text: string, hasQueryContext = false): Promise<ClassificationResult> {
    if (!this.nlp) throw new NlpNotInitializedError();

    // Apply typo correction before classification
    const typoResult = correctTypos(text);
    const processedText = typoResult.wasCorrected ? typoResult.corrected : text;
    if (typoResult.wasCorrected) {
      logger.debug(
        { original: text, corrected: processedText, corrections: typoResult.corrections },
        'Typo correction applied before NLP classification'
      );
    }

    // Cache lookup — normalized lowercase key for case-insensitive matching
    const cacheKey = processedText.trim().toLowerCase();
    const cached = this.classificationCache.get(cacheKey);
    if (cached) {
      logger.debug({ text: cacheKey, intent: cached.intent }, 'NLP cache hit');
      // Attach corrections even on cache hit so the response can show "Did you mean"
      if (typoResult.wasCorrected) {
        return { ...cached, corrections: typoResult.corrections };
      }
      return cached;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await this.nlp.process('en', processedText);

    if (result.intent === 'None' || result.score < NLP_CONFIDENCE_THRESHOLD) {
      logger.debug({ text, score: result.score }, 'Low confidence, trying fuzzy match');
      const fuzzyResult = this.fuzzyMatcher.match(text);
      if (fuzzyResult) {
        const r: ClassificationResult = {
          intent: fuzzyResult.intent,
          confidence: fuzzyResult.score,
          entities: [],
          source: fuzzyResult.source,
          ...(typoResult.wasCorrected && { corrections: typoResult.corrections }),
        };
        this.classificationCache.set(cacheKey, r);
        return r;
      }
    }

    // Guard: if text looks like a question but matched a simple intent
    // (farewell/greeting) at borderline confidence, demote to None
    if (
      SIMPLE_INTENTS.has(result.intent) &&
      QUESTION_PATTERN.test(text) &&
      result.score < SIMPLE_INTENT_QUESTION_THRESHOLD
    ) {
      logger.debug(
        { text, intent: result.intent, score: result.score },
        'Question-pattern detected with simple-intent — demoting to unknown'
      );
      const fuzzyResult = this.fuzzyMatcher.match(text);
      if (fuzzyResult) {
        const r: ClassificationResult = {
          intent: fuzzyResult.intent,
          confidence: fuzzyResult.score,
          entities: [],
          source: fuzzyResult.source,
          ...(typoResult.wasCorrected && { corrections: typoResult.corrections }),
        };
        this.classificationCache.set(cacheKey, r);
        return r;
      }
      const r: ClassificationResult = {
        intent: 'None',
        confidence: result.score || 0,
        entities: [],
        source: 'nlp',
        ...(typoResult.wasCorrected && { corrections: typoResult.corrections }),
      };
      this.classificationCache.set(cacheKey, r);
      return r;
    }

    const entities: ExtractedEntity[] = (result.entities || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => ({
        entity: e.entity,
        value: e.option || e.sourceText,
        resolution: e.resolution,
        start: e.start,
        end: e.end,
      })
    );

    // Auto-detect date entities if NLP didn't find a time_period
    if (!entities.some((e) => e.entity === 'time_period')) {
      const dateEntities = extractDateEntities(text);
      entities.push(...dateEntities);
    }

    let finalIntent = result.intent || 'None';
    let finalScore = result.score || 0;

    // Context-aware boosting: when user has active query results, prefer follow-up
    // intents if they scored close to the top result. This prevents "group by status"
    // from being classified as query.execute when the user is working with data.
    if (hasQueryContext && finalIntent !== 'None') {
      const followupIntents = new Set([
        'followup.group_by', 'followup.sort', 'followup.filter',
        'followup.summary', 'followup.top_n', 'followup.aggregation',
        'followup.data_lookup',
      ]);

      // If already a follow-up intent, no boosting needed
      if (!followupIntents.has(finalIntent)) {
        const classifications: Array<{ intent: string; score: number }> =
          result.classifications || [];
        for (const cls of classifications) {
          if (followupIntents.has(cls.intent) && cls.score >= finalScore - 0.20) {
            logger.debug(
              { original: finalIntent, boosted: cls.intent, origScore: finalScore, boostScore: cls.score },
              'Context-aware boost: preferring follow-up intent'
            );
            finalIntent = cls.intent;
            finalScore = cls.score;
            break;
          }
        }
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
      source: 'nlp',
      ...(typoResult.wasCorrected && { corrections: typoResult.corrections }),
    };
    this.classificationCache.set(cacheKey, classificationResult);
    return classificationResult;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /** Returns cached overlap warnings from the last training run. */
  getOverlaps(): IntentOverlap[] {
    return this.cachedOverlaps;
  }

  /**
   * Fetch all query names from the data store (mock-api/db.json via the API)
   * and register any that are not already in the corpus as `query_name` entity
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
      if (entityOptions && typeof entityOptions === 'object') {
        for (const key of Object.keys(entityOptions)) {
          corpusQueryNames.add(key.toLowerCase());
        }
      }

      // Read directly from db.json (bypasses mock API in-memory cache staleness)
      const dbPath = paths.mockApi.dbJson;
      const raw = await fsPromises.readFile(dbPath, 'utf-8');
      const dbData = JSON.parse(raw);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allQueries: any[] = dbData.queries || [];

      // Filter by group sources if applicable
      let queries = allQueries;
      if (this.sources.length > 0) {
        queries = allQueries.filter(
          (q) => q.source && this.sources.includes(q.source)
        );
      }

      let addedCount = 0;
      for (const q of queries) {
        const name = q.name as string;
        if (!name) continue;

        if (!corpusQueryNames.has(name.toLowerCase())) {
          // Generate synonyms from the query name (replace underscores, add description words)
          const synonyms: string[] = [name];
          const readable = name.replace(/_/g, ' ');
          if (readable !== name) synonyms.push(readable);
          if (q.description) {
            // Add first few meaningful words of description as a synonym
            const descWords = (q.description as string).split(/\s+/).slice(0, 4).join(' ');
            if (descWords.length > 3) synonyms.push(descWords);
          }

          // Register as a named entity option in the NLP manager
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nlpAny = this.nlp as any;
          const manager = nlpAny.container?.get?.('ner') ?? nlpAny.ner;
          if (manager?.addRuleOptionTexts) {
            manager.addRuleOptionTexts('en', 'query_name', name, synonyms);
          } else if (nlpAny.addNerRuleOptionTexts) {
            nlpAny.addNerRuleOptionTexts('en', 'query_name', name, synonyms);
          }
          addedCount++;
        }
      }

      if (addedCount > 0) {
        logger.info({ addedCount, total: queries.length }, 'Synced dynamic query_name entities from db.json');
      }
    } catch (error) {
      // Non-critical: if we can't read db.json, the corpus entities still work
      logger.warn({ error }, 'Could not sync dynamic query entities from db.json — using corpus entities only');
    }
  }

  /**
   * Cross-classifies each training utterance against the trained model to detect:
   * 1. Utterances that classify to a DIFFERENT intent than their training intent
   * 2. Utterances where top-2 intent confidences are within 0.15 (ambiguous)
   */
  private async detectOverlaps(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    corpusData: any
  ): Promise<IntentOverlap[]> {
    if (!this.nlp) return [];

    const overlaps: IntentOverlap[] = [];
    const dataEntries: Array<{ intent: string; utterances: string[] }> =
      corpusData.data || [];

    for (const entry of dataEntries) {
      const trainedIntent = entry.intent;

      for (const utterance of entry.utterances) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = await this.nlp.process('en', utterance);
        const classifiedIntent = result.intent || 'None';
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
