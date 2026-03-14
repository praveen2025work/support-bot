import { containerBootstrap } from '@nlpjs/core';
import { Nlp } from '@nlpjs/nlp';
import { LangEn } from '@nlpjs/lang-en';
import { LRUCache } from 'lru-cache';
import { NLP_CONFIDENCE_THRESHOLD } from '../constants';
import { NlpNotInitializedError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { extractDateEntities } from './date-entity-extractor';
import type { ClassificationResult, ExtractedEntity, IntentOverlap } from '../types';
import type { FuzzyMatcher } from './fuzzy-matcher';

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
  // Classification cache — avoids re-running NLP for identical user texts.
  // At 1500 req/min, many users ask similar/identical questions (e.g. "help",
  // "list queries"). Cache saves ~50ms per hit. 2000 entries × 2min TTL.
  private classificationCache = new LRUCache<string, ClassificationResult>({
    max: 2000,
    ttl: 2 * 60 * 1000,
  });

  constructor(fuzzyMatcher: FuzzyMatcher, corpusFile?: string | null) {
    this.fuzzyMatcher = fuzzyMatcher;
    this.corpusFile = corpusFile ?? null;
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

  async classify(text: string): Promise<ClassificationResult> {
    if (!this.nlp) throw new NlpNotInitializedError();

    // Cache lookup — normalized lowercase key for case-insensitive matching
    const cacheKey = text.trim().toLowerCase();
    const cached = this.classificationCache.get(cacheKey);
    if (cached) {
      logger.debug({ text: cacheKey, intent: cached.intent }, 'NLP cache hit');
      return cached;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await this.nlp.process('en', text);

    if (result.intent === 'None' || result.score < NLP_CONFIDENCE_THRESHOLD) {
      logger.debug({ text, score: result.score }, 'Low confidence, trying fuzzy match');
      const fuzzyResult = this.fuzzyMatcher.match(text);
      if (fuzzyResult) {
        const r: ClassificationResult = {
          intent: fuzzyResult.intent,
          confidence: fuzzyResult.score,
          entities: [],
          source: fuzzyResult.source,
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
        };
        this.classificationCache.set(cacheKey, r);
        return r;
      }
      const r: ClassificationResult = {
        intent: 'None',
        confidence: result.score || 0,
        entities: [],
        source: 'nlp',
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

    const classificationResult: ClassificationResult = {
      intent: result.intent || 'None',
      confidence: result.score || 0,
      entities,
      sentiment: result.sentiment
        ? {
            score: result.sentiment.score,
            comparative: result.sentiment.comparative,
            vote: result.sentiment.vote,
          }
        : undefined,
      source: 'nlp',
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
