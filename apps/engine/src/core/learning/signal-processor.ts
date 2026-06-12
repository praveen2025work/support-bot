import { promises as fsp } from "fs";
import { logger } from "@/lib/logger";
import { paths } from "@/lib/env-config";
import type { SignalAggregate } from "./types";
import {
  AUTO_LEARN_MIN_POSITIVE,
  AUTO_LEARN_MAX_NEG_RATIO,
} from "../constants";

interface CorpusData {
  name: string;
  locale: string;
  entities: Record<string, { options: Record<string, string[]> }>;
  data: Array<{ intent: string; utterances: string[]; answers?: string[] }>;
}

export class SignalProcessor {
  normalizeUtterance(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, " ");
  }

  async isAlreadyInCorpus(
    utterance: string,
    intent: string,
    corpusPath: string,
  ): Promise<boolean> {
    try {
      await fsp.access(corpusPath);
    } catch {
      return false;
    }
    try {
      const corpus: CorpusData = JSON.parse(
        await fsp.readFile(corpusPath, "utf-8"),
      );
      const normalized = this.normalizeUtterance(utterance);
      const intentData = corpus.data.find((d) => d.intent === intent);
      if (!intentData) return false;
      return intentData.utterances.some(
        (u) => this.normalizeUtterance(u) === normalized,
      );
    } catch {
      return false;
    }
  }

  /**
   * Compute a time-decayed signal score.
   * Recent signals are weighted more heavily than old ones.
   * Half-life: 7 days — a signal loses half its weight after one week.
   */
  computeDecayedScore(signals: SignalAggregate): {
    effective: number;
    negRatio: number;
  } {
    const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();
    const lastAt = signals.lastSignalAt
      ? new Date(signals.lastSignalAt).getTime()
      : now;
    const age = Math.max(0, now - lastAt);
    const decay = Math.pow(0.5, age / HALF_LIFE_MS);

    const effective = signals.positive * decay;
    const total = (signals.positive + signals.negative) * decay;
    const negRatio = total > 0 ? (signals.negative * decay) / total : 0;

    return { effective, negRatio };
  }

  shouldAutoPromote(signals: SignalAggregate): boolean {
    // Use decayed scores when timestamp is available
    if (signals.lastSignalAt) {
      const { effective, negRatio } = this.computeDecayedScore(signals);
      return (
        effective >= AUTO_LEARN_MIN_POSITIVE &&
        negRatio <= AUTO_LEARN_MAX_NEG_RATIO
      );
    }
    // Fallback: raw counts (backward compatible)
    if (signals.positive < AUTO_LEARN_MIN_POSITIVE) return false;
    const total = signals.positive + signals.negative;
    if (total === 0) return false;
    return signals.negative / total <= AUTO_LEARN_MAX_NEG_RATIO;
  }

  async addToCorpus(
    utterance: string,
    intent: string,
    corpusPath: string,
  ): Promise<boolean> {
    try {
      try {
        await fsp.access(corpusPath);
      } catch {
        logger.warn({ corpusPath }, "Corpus file not found for auto-learn");
        return false;
      }

      const corpus: CorpusData = JSON.parse(
        await fsp.readFile(corpusPath, "utf-8"),
      );
      let intentData = corpus.data.find((d) => d.intent === intent);

      if (!intentData) {
        // Create new intent entry
        intentData = { intent, utterances: [], answers: [] };
        corpus.data.push(intentData);
      }

      const normalized = this.normalizeUtterance(utterance);
      if (
        intentData.utterances.some(
          (u) => this.normalizeUtterance(u) === normalized,
        )
      ) {
        return false; // Already exists
      }

      intentData.utterances.push(utterance);
      await fsp.writeFile(corpusPath, JSON.stringify(corpus, null, 2), "utf-8");
      logger.info(
        { utterance, intent, corpusPath },
        "Auto-learned utterance added to corpus",
      );
      return true;
    } catch (error) {
      logger.error(
        { error, utterance, intent },
        "Failed to add utterance to corpus",
      );
      return false;
    }
  }

  async getCorpusPath(groupId: string): Promise<string> {
    // Group-specific corpus files live in training/groups/
    if (groupId && groupId !== "default") {
      const groupPath = paths.training.groupCorpus(groupId);
      try {
        await fsp.access(groupPath);
        return groupPath;
      } catch {
        // Fall through to default
      }
    }
    return paths.training.corpus;
  }
}
