import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { logger } from '@/lib/logger';
import type { SignalAggregate } from './types';
import {
  AUTO_LEARN_MIN_POSITIVE,
  AUTO_LEARN_MAX_NEG_RATIO,
} from '../constants';

interface CorpusData {
  name: string;
  locale: string;
  entities: Record<string, { options: Record<string, string[]> }>;
  data: Array<{ intent: string; utterances: string[]; answers?: string[] }>;
}

export class SignalProcessor {
  normalizeUtterance(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  isAlreadyInCorpus(utterance: string, intent: string, corpusPath: string): boolean {
    if (!existsSync(corpusPath)) return false;
    try {
      const corpus: CorpusData = JSON.parse(readFileSync(corpusPath, 'utf-8'));
      const normalized = this.normalizeUtterance(utterance);
      const intentData = corpus.data.find((d) => d.intent === intent);
      if (!intentData) return false;
      return intentData.utterances.some(
        (u) => this.normalizeUtterance(u) === normalized
      );
    } catch {
      return false;
    }
  }

  shouldAutoPromote(signals: SignalAggregate): boolean {
    if (signals.positive < AUTO_LEARN_MIN_POSITIVE) return false;
    const total = signals.positive + signals.negative;
    if (total === 0) return false;
    return signals.negative / total <= AUTO_LEARN_MAX_NEG_RATIO;
  }

  addToCorpus(utterance: string, intent: string, corpusPath: string): boolean {
    try {
      if (!existsSync(corpusPath)) {
        logger.warn({ corpusPath }, 'Corpus file not found for auto-learn');
        return false;
      }

      const corpus: CorpusData = JSON.parse(readFileSync(corpusPath, 'utf-8'));
      let intentData = corpus.data.find((d) => d.intent === intent);

      if (!intentData) {
        // Create new intent entry
        intentData = { intent, utterances: [], answers: [] };
        corpus.data.push(intentData);
      }

      const normalized = this.normalizeUtterance(utterance);
      if (intentData.utterances.some((u) => this.normalizeUtterance(u) === normalized)) {
        return false; // Already exists
      }

      intentData.utterances.push(utterance);
      writeFileSync(corpusPath, JSON.stringify(corpus, null, 2), 'utf-8');
      logger.info({ utterance, intent, corpusPath }, 'Auto-learned utterance added to corpus');
      return true;
    } catch (error) {
      logger.error({ error, utterance, intent }, 'Failed to add utterance to corpus');
      return false;
    }
  }

  getCorpusPath(groupId: string): string {
    // Group-specific corpus files live in training/groups/
    if (groupId && groupId !== 'default') {
      const groupPath = resolve(process.cwd(), `src/training/groups/corpus-${groupId}.json`);
      if (existsSync(groupPath)) return groupPath;
    }
    return resolve(process.cwd(), 'src/training/corpus.json');
  }
}
