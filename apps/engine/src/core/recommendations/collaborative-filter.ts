import { promises as fs } from 'fs';
import { dirname } from 'path';
import { logger } from '@/lib/logger';
import { paths } from '@/lib/env-config';
import type { UserQueryInteraction } from './types';

interface SimilarityEntry {
  name: string;
  score: number;
}

/**
 * Item-item collaborative filtering using Jaccard similarity.
 * For each query pair, computes the overlap of their user sets.
 */
export class CollaborativeFilter {
  private matrix: Record<string, SimilarityEntry[]> = {};
  private groupId: string;
  private loaded = false;

  constructor(groupId: string) {
    this.groupId = groupId;
  }

  /** Build the similarity matrix from interactions */
  build(interactions: UserQueryInteraction[]): void {
    // Build user sets per query
    const queryUsers = new Map<string, Set<string>>();
    for (const i of interactions) {
      if (!queryUsers.has(i.queryName)) queryUsers.set(i.queryName, new Set());
      queryUsers.get(i.queryName)!.add(i.userId);
    }

    const queryNames = Array.from(queryUsers.keys());
    this.matrix = {};

    for (const q1 of queryNames) {
      const users1 = queryUsers.get(q1)!;
      const similar: SimilarityEntry[] = [];

      for (const q2 of queryNames) {
        if (q1 === q2) continue;
        const users2 = queryUsers.get(q2)!;

        // Jaccard similarity
        let intersection = 0;
        for (const u of users1) {
          if (users2.has(u)) intersection++;
        }
        const union = users1.size + users2.size - intersection;
        const score = union > 0 ? intersection / union : 0;

        if (score > 0) {
          similar.push({ name: q2, score });
        }
      }

      similar.sort((a, b) => b.score - a.score);
      this.matrix[q1] = similar.slice(0, 10);
    }

    this.loaded = true;
    logger.info({ groupId: this.groupId, queries: queryNames.length }, 'Collaborative filter built');
  }

  /** Get similar queries */
  getSimilar(queryName: string, topK: number = 5): SimilarityEntry[] {
    return (this.matrix[queryName] || []).slice(0, topK);
  }

  async save(): Promise<void> {
    const filePath = paths.data.collaborativeMatrix(this.groupId);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(this.matrix, null, 2), 'utf-8');
  }

  async load(): Promise<boolean> {
    try {
      const raw = await fs.readFile(paths.data.collaborativeMatrix(this.groupId), 'utf-8');
      this.matrix = JSON.parse(raw);
      this.loaded = true;
      return true;
    } catch {
      return false;
    }
  }

  get isLoaded(): boolean {
    return this.loaded;
  }
}
