import Fuse from 'fuse.js';
import { FUZZY_CONFIDENCE_THRESHOLD } from '../constants';

interface FaqEntry {
  question: string;
  intent: string;
  answer: string;
}

export interface FuzzyMatchResult {
  intent: string;
  score: number;
  answer: string;
}

export class FuzzyMatcher {
  private fuse: Fuse<FaqEntry> | null = null;
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

    this.fuse = new Fuse(data, {
      keys: ['question'],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 3,
    });
    this.initialized = true;
  }

  match(text: string): FuzzyMatchResult | null {
    if (!this.fuse) return null;

    const results = this.fuse.search(text);
    if (results.length === 0 || results[0].score === undefined) return null;

    const best = results[0];
    const confidence = 1 - best.score!;

    if (confidence < FUZZY_CONFIDENCE_THRESHOLD) return null;

    return {
      intent: best.item.intent,
      score: confidence,
      answer: best.item.answer,
    };
  }
}
