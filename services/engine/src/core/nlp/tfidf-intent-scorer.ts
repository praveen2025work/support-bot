/**
 * TF-IDF based intent scorer.
 * Builds per-intent TF-IDF vectors from training corpus utterances.
 * Scores new queries by cosine similarity against each intent's centroid.
 */

import { logger } from '@/lib/logger';

interface IntentScore {
  intent: string;
  score: number;
}

interface IntentVectors {
  intent: string;
  centroid: Map<string, number>;
  utteranceCount: number;
}

// Simple stopwords list
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
  'not', 'no', 'so', 'if', 'then', 'than', 'too', 'very', 'just',
  'about', 'up', 'out', 'all', 'also', 'how', 'each', 'which', 'their',
  'there', 'this', 'that', 'these', 'those', 'it', 'its', 'my', 'your',
  'we', 'they', 'i', 'me', 'he', 'she', 'him', 'her', 'who', 'what',
  'when', 'where', 'why',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

export class TfIdfIntentScorer {
  private intentVectors: IntentVectors[] = [];
  private idf: Map<string, number> = new Map();
  private initialized = false;

  /**
   * Initialize from corpus data.
   * @param intentUtterances Map of intent name → array of training utterances
   */
  initialize(intentUtterances: Map<string, string[]>): void {
    // Compute document frequency (df) across all utterances
    const df = new Map<string, number>();
    let totalDocs = 0;

    const allTokenizedDocs: Array<{ intent: string; tokens: string[] }> = [];

    Array.from(intentUtterances.entries()).forEach(([intent, utterances]) => {
      for (const utt of utterances) {
        const tokens = tokenize(utt);
        const uniqueTokens = Array.from(new Set(tokens));
        uniqueTokens.forEach((token) => {
          df.set(token, (df.get(token) || 0) + 1);
        });
        allTokenizedDocs.push({ intent, tokens });
        totalDocs++;
      }
    });

    // Compute IDF
    Array.from(df.entries()).forEach(([term, freq]) => {
      this.idf.set(term, Math.log((totalDocs + 1) / (freq + 1)) + 1);
    });

    // Build per-intent centroids (average TF-IDF vectors)
    Array.from(intentUtterances.entries()).forEach(([intent, utterances]) => {
      const centroid = new Map<string, number>();
      const docs = allTokenizedDocs.filter((d) => d.intent === intent);

      for (const doc of docs) {
        const tf = new Map<string, number>();
        for (const token of doc.tokens) {
          tf.set(token, (tf.get(token) || 0) + 1);
        }
        Array.from(tf.entries()).forEach(([term, freq]) => {
          const tfidf = (freq / doc.tokens.length) * (this.idf.get(term) || 1);
          centroid.set(term, (centroid.get(term) || 0) + tfidf);
        });
      }

      // Average the centroid
      if (docs.length > 0) {
        Array.from(centroid.entries()).forEach(([term, val]) => {
          centroid.set(term, val / docs.length);
        });
      }

      this.intentVectors.push({ intent, centroid, utteranceCount: utterances.length });
    });

    this.initialized = true;
    logger.info({ intentCount: intentUtterances.size, totalDocs }, 'TF-IDF intent scorer initialized');
  }

  /**
   * Score a query against all intent centroids.
   * Returns top scored intents sorted by score descending.
   */
  score(text: string): IntentScore[] {
    if (!this.initialized || this.intentVectors.length === 0) {
      return [];
    }

    const tokens = tokenize(text);
    if (tokens.length === 0) return [];

    // Build TF-IDF vector for query
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    const queryVec = new Map<string, number>();
    Array.from(tf.entries()).forEach(([term, freq]) => {
      queryVec.set(term, (freq / tokens.length) * (this.idf.get(term) || 1));
    });

    // Compute cosine similarity against each intent centroid
    const scores: IntentScore[] = [];
    for (const iv of this.intentVectors) {
      const sim = this.cosineSimilarity(queryVec, iv.centroid);
      if (sim > 0) {
        scores.push({ intent: iv.intent, score: sim });
      }
    }

    return scores.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  private cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    Array.from(a.entries()).forEach(([term, val]) => {
      normA += val * val;
      const bVal = b.get(term);
      if (bVal !== undefined) {
        dotProduct += val * bVal;
      }
    });
    Array.from(b.values()).forEach((val) => {
      normB += val * val;
    });

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }
}
