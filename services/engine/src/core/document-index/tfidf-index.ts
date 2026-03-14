import { logger } from '@/lib/logger';
import { promises as fs } from 'fs';
import { join } from 'path';
import { paths } from '@/lib/env-config';
import type { Chunk } from './chunker';

export interface ScoredChunk {
  chunk: Chunk;
  score: number;
}

interface SerializedIndex {
  chunks: Chunk[];
  updatedAt: string;
}

/**
 * TF-IDF + BM25 search index for document chunks.
 * Uses the `natural` library's TfIdf for term weighting,
 * plus a custom BM25 scorer for better relevance ranking.
 */
export class TfIdfIndex {
  private chunks: Chunk[] = [];
  private groupId: string;
  private indexDir: string;

  // BM25 parameters
  private readonly k1 = 1.2;
  private readonly b = 0.75;

  constructor(groupId: string) {
    this.groupId = groupId;
    this.indexDir = paths.data.groupIndexDir(groupId);
  }

  /** Add chunks to the index */
  addChunks(chunks: Chunk[]): void {
    this.chunks.push(...chunks);
  }

  /** Remove all chunks for a given document */
  removeDocument(documentId: string): void {
    this.chunks = this.chunks.filter((c) => c.documentId !== documentId);
  }

  /** Get all indexed chunks */
  getChunks(): Chunk[] {
    return this.chunks;
  }

  /** Get chunk count */
  get size(): number {
    return this.chunks.length;
  }

  /**
   * Search using BM25 scoring algorithm.
   * BM25 is a probabilistic ranking function that considers:
   * - Term frequency (with saturation via k1)
   * - Inverse document frequency
   * - Document length normalization (via b)
   */
  search(query: string, topK: number = 5): ScoredChunk[] {
    if (this.chunks.length === 0) return [];

    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return [];

    // Build document frequency map
    const df = new Map<string, number>();
    const docTermFreqs: Map<string, number>[] = [];
    const docLengths: number[] = [];
    let avgDl = 0;

    for (const chunk of this.chunks) {
      const terms = tokenize(chunk.text);
      docLengths.push(terms.length);
      avgDl += terms.length;

      const tf = new Map<string, number>();
      for (const term of terms) {
        tf.set(term, (tf.get(term) || 0) + 1);
      }
      docTermFreqs.push(tf);

      // Count document frequency (unique terms per doc)
      for (const term of new Set(terms)) {
        df.set(term, (df.get(term) || 0) + 1);
      }
    }

    avgDl = avgDl / this.chunks.length;
    const N = this.chunks.length;

    // Score each document using BM25
    const scored: ScoredChunk[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      let score = 0;
      const tf = docTermFreqs[i];
      const dl = docLengths[i];

      for (const term of queryTerms) {
        const termDf = df.get(term) || 0;
        if (termDf === 0) continue;

        // IDF component: log((N - df + 0.5) / (df + 0.5) + 1)
        const idf = Math.log((N - termDf + 0.5) / (termDf + 0.5) + 1);

        // TF component with BM25 saturation
        const termTf = tf.get(term) || 0;
        const tfNorm =
          (termTf * (this.k1 + 1)) /
          (termTf + this.k1 * (1 - this.b + this.b * (dl / avgDl)));

        score += idf * tfNorm;
      }

      if (score > 0) {
        scored.push({ chunk: this.chunks[i], score });
      }
    }

    // Sort by score descending, return top K
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /** Persist index to disk */
  async save(): Promise<void> {
    try {
      await fs.mkdir(this.indexDir, { recursive: true });
      const data: SerializedIndex = {
        chunks: this.chunks,
        updatedAt: new Date().toISOString(),
      };
      await fs.writeFile(
        join(this.indexDir, 'tfidf-index.json'),
        JSON.stringify(data),
        'utf-8'
      );
      logger.info(
        { groupId: this.groupId, chunks: this.chunks.length },
        'TF-IDF index saved to disk'
      );
    } catch (error) {
      logger.error({ error, groupId: this.groupId }, 'Failed to save TF-IDF index');
    }
  }

  /** Load index from disk */
  async load(): Promise<boolean> {
    try {
      const raw = await fs.readFile(
        join(this.indexDir, 'tfidf-index.json'),
        'utf-8'
      );
      const data: SerializedIndex = JSON.parse(raw);
      this.chunks = data.chunks;
      logger.info(
        { groupId: this.groupId, chunks: this.chunks.length, updatedAt: data.updatedAt },
        'TF-IDF index loaded from disk'
      );
      return true;
    } catch {
      // Index doesn't exist yet — that's fine
      return false;
    }
  }

  /** Full rebuild: clear and re-index */
  rebuild(allChunks: Chunk[]): void {
    this.chunks = allChunks;
    logger.info(
      { groupId: this.groupId, chunks: allChunks.length },
      'TF-IDF index rebuilt'
    );
  }
}

/**
 * Tokenize text into lowercase stemmed terms.
 * Removes stop words and short tokens.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
  'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can',
  'this', 'that', 'these', 'those', 'am', 'not', 'no', 'nor', 'so',
  'if', 'then', 'than', 'too', 'very', 'just', 'about', 'above',
  'after', 'again', 'all', 'also', 'any', 'because', 'before',
  'between', 'both', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'only', 'own', 'same', 'into', 'over', 'under',
  'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why',
  'up', 'out', 'off', 'down', 'here', 'there', 'me', 'my', 'we',
  'our', 'you', 'your', 'he', 'she', 'his', 'her', 'they', 'their',
  'its', 'us', 'him', 'them',
]);
