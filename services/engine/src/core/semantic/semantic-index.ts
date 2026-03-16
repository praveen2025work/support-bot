import { promises as fs } from 'fs';
import { dirname } from 'path';
import { logger } from '@/lib/logger';
import { paths } from '@/lib/env-config';
import type { SemanticSearchResult } from './types';

// Use natural's TfIdf and stemmer
import natural from 'natural';
const { TfIdf, PorterStemmer } = natural;

interface QueryDoc {
  queryName: string;
  description: string;
  terms: string[];
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
  'each', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'only', 'same', 'than', 'too', 'very', 'just', 'because',
  'if', 'when', 'where', 'how', 'what', 'which', 'who', 'whom',
  'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our',
  'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its',
  'they', 'them', 'their', 'run', 'show', 'get', 'find', 'query',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[_\-]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map((w) => PorterStemmer.stem(w));
}

/**
 * TF-IDF semantic index for query discovery.
 * Lets users find queries by natural language description.
 */
export class SemanticIndex {
  private tfidf: InstanceType<typeof TfIdf>;
  private docs: QueryDoc[] = [];
  private groupId: string;
  private built = false;

  constructor(groupId: string) {
    this.groupId = groupId;
    this.tfidf = new TfIdf();
  }

  /**
   * Build the index from a list of queries.
   */
  buildIndex(queries: Array<{ name: string; description?: string }>): void {
    this.tfidf = new TfIdf();
    this.docs = [];

    for (const q of queries) {
      // Combine name and description for richer matching
      const text = `${q.name.replace(/_/g, ' ')} ${q.description || ''}`;
      const terms = tokenize(text);
      this.docs.push({
        queryName: q.name,
        description: q.description || '',
        terms,
      });
      this.tfidf.addDocument(terms.join(' '));
    }

    this.built = true;
    logger.info({ groupId: this.groupId, docCount: this.docs.length }, 'Semantic index built');
  }

  /**
   * Search queries by natural language text.
   */
  search(text: string, topK: number = 5): SemanticSearchResult[] {
    if (!this.built || this.docs.length === 0) return [];

    const queryTerms = tokenize(text);
    if (queryTerms.length === 0) return [];

    const scores: Array<{ idx: number; score: number; matchedTerms: string[] }> = [];

    for (let i = 0; i < this.docs.length; i++) {
      let score = 0;
      const matched: string[] = [];

      for (const term of queryTerms) {
        const tfidfScore = this.tfidf.tfidf(term, i);
        if (tfidfScore > 0) {
          score += tfidfScore;
          matched.push(term);
        }
      }

      if (score > 0) {
        // Normalize by number of query terms for consistency
        scores.push({ idx: i, score: score / queryTerms.length, matchedTerms: matched });
      }
    }

    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK).map((s) => ({
      queryName: this.docs[s.idx].queryName,
      description: this.docs[s.idx].description,
      score: Math.round(s.score * 1000) / 1000,
      matchedTerms: s.matchedTerms,
    }));
  }

  /** Persist index to disk */
  async save(): Promise<void> {
    const filePath = paths.data.semanticIndex(this.groupId);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify({
      docs: this.docs,
      updatedAt: new Date().toISOString(),
    }, null, 2), 'utf-8');
  }

  /** Load index from disk */
  async load(): Promise<boolean> {
    try {
      const raw = await fs.readFile(paths.data.semanticIndex(this.groupId), 'utf-8');
      const data = JSON.parse(raw);
      if (data.docs?.length) {
        this.tfidf = new TfIdf();
        this.docs = data.docs;
        for (const doc of this.docs) {
          this.tfidf.addDocument(doc.terms.join(' '));
        }
        this.built = true;
        return true;
      }
    } catch {
      // No cached index
    }
    return false;
  }

  get isBuilt(): boolean {
    return this.built;
  }
}

// Singleton per group
const instances = new Map<string, SemanticIndex>();

export function getSemanticIndex(groupId: string): SemanticIndex {
  let idx = instances.get(groupId);
  if (!idx) {
    idx = new SemanticIndex(groupId);
    instances.set(groupId, idx);
  }
  return idx;
}
