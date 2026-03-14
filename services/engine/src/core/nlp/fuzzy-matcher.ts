import Fuse from 'fuse.js';
import { FUZZY_CONFIDENCE_THRESHOLD } from '../constants';
import { expandWithSynonyms, generateSynonymVariants } from './synonym-expander';

interface FaqEntry {
  question: string;
  intent: string;
  answer: string;
}

export interface FuzzyMatchResult {
  intent: string;
  score: number;
  answer: string;
  source: 'fuzzy' | 'fuzzy_synonym';
}

export class FuzzyMatcher {
  private fuse: Fuse<FaqEntry> | null = null;
  private fuseSynonym: Fuse<FaqEntry> | null = null;
  private faqData: FaqEntry[] = [];
  private initialized = false;
  private faqFile: string | null;

  constructor(faqFile?: string | null) {
    this.faqFile = faqFile ?? null;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    let data: FaqEntry[];
    if (this.faqFile) {
      const mod = await import(`@/training/groups/${this.faqFile}`);
      data = mod.default as FaqEntry[];
    } else {
      const mod = await import('@/training/faq.json');
      data = mod.default as FaqEntry[];
    }

    this.faqData = [...data];

    // Primary index — direct matching
    this.fuse = new Fuse(data, {
      keys: ['question'],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 3,
    });

    // Synonym-expanded index — includes synonym variant questions
    const expandedData: FaqEntry[] = [...data];
    for (const entry of data) {
      const variants = generateSynonymVariants(entry.question, 3);
      for (const variant of variants) {
        expandedData.push({
          question: variant,
          intent: entry.intent,
          answer: entry.answer,
        });
      }
    }

    this.fuseSynonym = new Fuse(expandedData, {
      keys: ['question'],
      threshold: 0.35, // Tighter threshold since synonyms bridge the gap
      includeScore: true,
      minMatchCharLength: 3,
    });

    this.initialized = true;
  }

  /**
   * Match user text against FAQ entries.
   * Tries direct match first, then synonym-expanded match.
   */
  match(text: string): FuzzyMatchResult | null {
    if (!this.fuse || !this.fuseSynonym) return null;

    // 1. Direct fuzzy match
    const directResult = this.searchFuse(this.fuse, text);
    if (directResult && directResult.score >= FUZZY_CONFIDENCE_THRESHOLD) {
      return { ...directResult, source: 'fuzzy' };
    }

    // 2. Synonym-expanded match — expand the query and search the expanded index
    const expandedTerms = expandWithSynonyms(text);
    const expandedQuery = expandedTerms.join(' ');
    const synResult = this.searchFuse(this.fuseSynonym, expandedQuery);
    if (synResult && synResult.score >= FUZZY_CONFIDENCE_THRESHOLD) {
      return { ...synResult, source: 'fuzzy_synonym' };
    }

    // 3. If direct had a result but below threshold, return it anyway if close
    if (directResult && directResult.score >= FUZZY_CONFIDENCE_THRESHOLD * 0.8) {
      return { ...directResult, source: 'fuzzy' };
    }

    return null;
  }

  /**
   * Add a FAQ entry at runtime (e.g., from auto-FAQ generation).
   * Rebuilds the Fuse indexes.
   */
  addFaqEntry(question: string, intent: string, answer: string): void {
    const entry: FaqEntry = { question, intent, answer };
    this.faqData.push(entry);

    // Rebuild indexes
    this.fuse = new Fuse(this.faqData, {
      keys: ['question'],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 3,
    });

    const expandedData: FaqEntry[] = [...this.faqData];
    for (const e of this.faqData) {
      const variants = generateSynonymVariants(e.question, 3);
      for (const variant of variants) {
        expandedData.push({ question: variant, intent: e.intent, answer: e.answer });
      }
    }
    this.fuseSynonym = new Fuse(expandedData, {
      keys: ['question'],
      threshold: 0.35,
      includeScore: true,
      minMatchCharLength: 3,
    });
  }

  private searchFuse(
    fuse: Fuse<FaqEntry>,
    text: string
  ): Omit<FuzzyMatchResult, 'source'> | null {
    const results = fuse.search(text);
    if (results.length === 0 || results[0].score === undefined) return null;

    const best = results[0];
    const confidence = 1 - best.score!;

    return {
      intent: best.item.intent,
      score: confidence,
      answer: best.item.answer,
    };
  }
}
