import { promises as fs } from 'fs';
import { dirname } from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { logger } from '@/lib/logger';
import { paths } from '@/lib/env-config';

export interface CoOccurrenceMatrix {
  [queryName: string]: { [relatedQuery: string]: number };
}

/**
 * Builds a co-occurrence matrix from interaction logs.
 * Tracks which queries are frequently used together in sessions.
 */
export class CoOccurrenceTracker {
  private matrix: CoOccurrenceMatrix = {};
  private groupId: string;
  private outputPath: string;

  constructor(groupId: string = 'default') {
    this.groupId = groupId;
    this.outputPath = paths.data.coOccurrence(groupId);
  }

  /**
   * Build the co-occurrence matrix from interaction logs.
   * Groups interactions by session, finds query.execute intents,
   * and counts which queries appear together in the same session.
   */
  async build(): Promise<CoOccurrenceMatrix> {
    const logPath = paths.data.interactions(this.groupId);

    // Group interactions by session
    const sessions = new Map<string, string[]>();

    try {
      const stream = createReadStream(logPath, 'utf-8');
      const rl = createInterface({ input: stream, crlfDelay: Infinity });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.intent === 'query.execute' && entry.sessionId) {
            // Extract query name from the user message or entities
            const queryName = this.extractQueryName(entry);
            if (queryName) {
              if (!sessions.has(entry.sessionId)) {
                sessions.set(entry.sessionId, []);
              }
              const queries = sessions.get(entry.sessionId)!;
              if (!queries.includes(queryName)) {
                queries.push(queryName);
              }
            }
          }
        } catch {
          // Skip malformed lines
        }
      }
    } catch {
      // No interaction log yet — that's fine
      logger.debug({ groupId: this.groupId }, 'No interaction log found for co-occurrence');
      return this.matrix;
    }

    // Build co-occurrence counts
    this.matrix = {};
    for (const [, queries] of sessions) {
      if (queries.length < 2) continue;

      for (let i = 0; i < queries.length; i++) {
        for (let j = 0; j < queries.length; j++) {
          if (i === j) continue;
          if (!this.matrix[queries[i]]) {
            this.matrix[queries[i]] = {};
          }
          this.matrix[queries[i]][queries[j]] =
            (this.matrix[queries[i]][queries[j]] || 0) + 1;
        }
      }
    }

    // Save to disk
    await this.save();

    logger.info(
      {
        groupId: this.groupId,
        sessions: sessions.size,
        entries: Object.keys(this.matrix).length,
      },
      'Co-occurrence matrix built'
    );

    return this.matrix;
  }

  /**
   * Get queries most commonly used with the given query.
   */
  getRelated(queryName: string, topK: number = 5): Array<{ name: string; count: number }> {
    const related = this.matrix[queryName];
    if (!related) return [];

    return Object.entries(related)
      .sort(([, a], [, b]) => b - a)
      .slice(0, topK)
      .map(([name, count]) => ({ name, count }));
  }

  /** Load from disk */
  async load(): Promise<boolean> {
    try {
      const raw = await fs.readFile(this.outputPath, 'utf-8');
      this.matrix = JSON.parse(raw);
      return true;
    } catch {
      return false;
    }
  }

  private async save(): Promise<void> {
    await fs.mkdir(dirname(this.outputPath), { recursive: true });
    await fs.writeFile(this.outputPath, JSON.stringify(this.matrix, null, 2), 'utf-8');
  }

  private extractQueryName(entry: { userMessage?: string; entities?: Array<{ entity: string; value: string }> }): string | null {
    // Try entities first
    if (entry.entities) {
      const qe = entry.entities.find((e) => e.entity === 'query_name');
      if (qe) return qe.value;
    }
    return null;
  }
}
