import { promises as fs } from 'fs';
import { dirname } from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { logger } from '@/lib/logger';
import { paths } from '@/lib/env-config';
import type { UserQueryInteraction } from './types';

/**
 * Records user-query interactions for ML recommendation features.
 */
export class InteractionTracker {
  private groupId: string;

  constructor(groupId: string) {
    this.groupId = groupId;
  }

  /** Record a user-query interaction */
  async record(userId: string, queryName: string): Promise<void> {
    const now = new Date();
    const entry: UserQueryInteraction = {
      userId,
      queryName,
      timestamp: now.toISOString(),
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
    };

    const filePath = paths.data.userInteractions(this.groupId);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, JSON.stringify(entry) + '\n', 'utf-8');
  }

  /** Read all interactions from disk */
  async readAll(): Promise<UserQueryInteraction[]> {
    const filePath = paths.data.userInteractions(this.groupId);
    const interactions: UserQueryInteraction[] = [];

    try {
      const stream = createReadStream(filePath, 'utf-8');
      const rl = createInterface({ input: stream, crlfDelay: Infinity });
      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          interactions.push(JSON.parse(line));
        } catch { /* skip malformed */ }
      }
    } catch {
      // No file yet
    }

    return interactions;
  }
}

// Singleton per group
const instances = new Map<string, InteractionTracker>();

export function getInteractionTracker(groupId: string): InteractionTracker {
  let tracker = instances.get(groupId);
  if (!tracker) {
    tracker = new InteractionTracker(groupId);
    instances.set(groupId, tracker);
  }
  return tracker;
}
