import { promises as fs } from 'fs';
import { dirname } from 'path';
import { logger } from '@/lib/logger';
import { paths } from '@/lib/env-config';
import type { UserQueryInteraction, TimePattern } from './types';

/**
 * Aggregates query usage patterns by time-of-day and day-of-week.
 * Recommends queries that are popular at the current time.
 */
export class TimePatternAnalyzer {
  private patterns: Map<string, TimePattern> = new Map();
  private groupId: string;
  private loaded = false;

  constructor(groupId: string) {
    this.groupId = groupId;
  }

  /** Build time patterns from interactions */
  build(interactions: UserQueryInteraction[]): void {
    this.patterns.clear();

    for (const i of interactions) {
      let pattern = this.patterns.get(i.queryName);
      if (!pattern) {
        pattern = {
          queryName: i.queryName,
          hourDistribution: new Array(24).fill(0),
          dayDistribution: new Array(7).fill(0),
          totalCount: 0,
        };
        this.patterns.set(i.queryName, pattern);
      }

      pattern.hourDistribution[i.hour]++;
      pattern.dayDistribution[i.dayOfWeek]++;
      pattern.totalCount++;
    }

    // Normalize distributions
    for (const pattern of this.patterns.values()) {
      const hourSum = pattern.hourDistribution.reduce((a, b) => a + b, 0);
      const daySum = pattern.dayDistribution.reduce((a, b) => a + b, 0);
      if (hourSum > 0) pattern.hourDistribution = pattern.hourDistribution.map((v) => v / hourSum);
      if (daySum > 0) pattern.dayDistribution = pattern.dayDistribution.map((v) => v / daySum);
    }

    this.loaded = true;
    logger.info({ groupId: this.groupId, queries: this.patterns.size }, 'Time patterns built');
  }

  /** Get queries most relevant to the given time */
  getTimeRelevant(hour: number, dayOfWeek: number, topK: number = 5): Array<{ name: string; score: number }> {
    const scored: Array<{ name: string; score: number }> = [];

    for (const pattern of this.patterns.values()) {
      // Weighted combination of hour and day relevance
      const hourScore = pattern.hourDistribution[hour] || 0;
      const dayScore = pattern.dayDistribution[dayOfWeek] || 0;
      const score = hourScore * 0.6 + dayScore * 0.4;

      if (score > 0) {
        scored.push({ name: pattern.queryName, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async save(): Promise<void> {
    const filePath = paths.data.timePatterns(this.groupId);
    await fs.mkdir(dirname(filePath), { recursive: true });
    const data = Array.from(this.patterns.values());
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async load(): Promise<boolean> {
    try {
      const raw = await fs.readFile(paths.data.timePatterns(this.groupId), 'utf-8');
      const data: TimePattern[] = JSON.parse(raw);
      this.patterns.clear();
      for (const p of data) this.patterns.set(p.queryName, p);
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
