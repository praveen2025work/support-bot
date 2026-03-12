import { containerBootstrap } from '@nlpjs/core';
import { Nlp } from '@nlpjs/nlp';
import { LangEn } from '@nlpjs/lang-en';
import { NLP_CONFIDENCE_THRESHOLD } from '../constants';
import { NlpNotInitializedError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ClassificationResult, ExtractedEntity } from '../types';
import type { FuzzyMatcher } from './fuzzy-matcher';

export class NlpService {
  private nlp: InstanceType<typeof Nlp> | null = null;
  private fuzzyMatcher: FuzzyMatcher;
  private initialized = false;
  private corpusFile: string | null;

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

    let corpusData: unknown;
    if (this.corpusFile) {
      const mod = await import(`@/training/groups/${this.corpusFile}`);
      corpusData = mod.default;
    } else {
      const mod = await import('@/training/corpus.json');
      corpusData = mod.default;
    }

    await this.nlp.addCorpus(corpusData);
    await this.nlp.train();

    this.initialized = true;
    logger.info({ corpus: this.corpusFile ?? 'base' }, 'NLP model trained and ready');
  }

  async classify(text: string): Promise<ClassificationResult> {
    if (!this.nlp) throw new NlpNotInitializedError();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await this.nlp.process('en', text);

    if (result.intent === 'None' || result.score < NLP_CONFIDENCE_THRESHOLD) {
      logger.debug({ text, score: result.score }, 'Low confidence, trying fuzzy match');
      const fuzzyResult = this.fuzzyMatcher.match(text);
      if (fuzzyResult) {
        return {
          intent: fuzzyResult.intent,
          confidence: fuzzyResult.score,
          entities: [],
          source: 'fuzzy',
        };
      }
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

    return {
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
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
