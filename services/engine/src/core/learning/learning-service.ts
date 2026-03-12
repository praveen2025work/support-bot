import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/generate-id';
import { SignalProcessor } from './signal-processor';
import { invalidateEngine } from '@/lib/singleton';
import {
  LEARNING_CONFIDENCE_THRESHOLD,
  AUTO_LEARN_PROCESS_INTERVAL,
} from '../constants';
import type {
  InteractionLog,
  ReviewItem,
  AutoLearnedItem,
  SignalAggregate,
  LearningStats,
  FeedbackType,
} from './types';
import type { ClassificationResult } from '../types';

const DATA_DIR = join(process.cwd(), 'data/learning');

export class LearningService {
  private dir: string;
  private interactionsPath: string;
  private reviewQueuePath: string;
  private autoLearnedPath: string;
  private signalAggregatesPath: string;
  private processor: SignalProcessor;
  private interactionCount = 0;

  constructor(private groupId: string) {
    this.dir = join(DATA_DIR, groupId);
    this.interactionsPath = join(this.dir, 'interactions.jsonl');
    this.reviewQueuePath = join(this.dir, 'review-queue.jsonl');
    this.autoLearnedPath = join(this.dir, 'auto-learned.jsonl');
    this.signalAggregatesPath = join(this.dir, 'signal-aggregates.json');
    this.processor = new SignalProcessor();

    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true });
    }
  }

  logInteraction(
    classification: ClassificationResult,
    message: { text: string; sessionId: string; feedbackType?: FeedbackType; previousMessageText?: string }
  ): void {
    const entry: InteractionLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      sessionId: message.sessionId,
      groupId: this.groupId,
      userMessage: message.text,
      intent: classification.intent,
      confidence: classification.confidence,
      source: classification.source,
      entities: classification.entities,
      feedbackType: message.feedbackType || 'normal',
      previousMessageText: message.previousMessageText,
    };

    this.appendJsonl(this.interactionsPath, entry);
    this.interactionCount++;

    // Queue for review if low confidence
    if (classification.confidence < LEARNING_CONFIDENCE_THRESHOLD && classification.intent !== 'None') {
      this.addToReviewQueue(entry);
    }

    // Process feedback signals
    this.processFeedbackSignal(entry);

    // Periodically run auto-learn
    if (this.interactionCount % AUTO_LEARN_PROCESS_INTERVAL === 0) {
      this.processSignals();
    }
  }

  private addToReviewQueue(entry: InteractionLog): void {
    const item: ReviewItem = {
      id: generateId(),
      timestamp: entry.timestamp,
      userMessage: entry.userMessage,
      detectedIntent: entry.intent,
      confidence: entry.confidence,
      groupId: this.groupId,
      status: 'pending',
    };
    this.appendJsonl(this.reviewQueuePath, item);
    logger.debug({ message: entry.userMessage, confidence: entry.confidence }, 'Added to review queue');
  }

  private processFeedbackSignal(entry: InteractionLog): void {
    const aggregates = this.readSignalAggregates();
    const normalized = this.processor.normalizeUtterance(entry.userMessage);

    if (entry.feedbackType === 'suggestion_click') {
      // Positive signal: user confirmed by clicking suggestion
      const key = normalized;
      if (!aggregates[key]) {
        aggregates[key] = { intent: entry.intent, positive: 0, negative: 0 };
      }
      aggregates[key].positive++;
      this.writeSignalAggregates(aggregates);
    } else if (entry.feedbackType === 'rephrase' || entry.feedbackType === 'retry') {
      // Negative signal: user rephrased or retried — penalize previous utterance
      if (entry.previousMessageText) {
        const prevKey = this.processor.normalizeUtterance(entry.previousMessageText);
        if (aggregates[prevKey]) {
          aggregates[prevKey].negative++;
          this.writeSignalAggregates(aggregates);
        }
      }
    }
  }

  getReviewQueue(limit = 50, status?: string): ReviewItem[] {
    const items = this.readJsonl<ReviewItem>(this.reviewQueuePath);
    const filtered = status ? items.filter((i) => i.status === status) : items;
    return filtered.slice(-limit).reverse();
  }

  resolveReviewItem(id: string, correctIntent: string): boolean {
    const items = this.readJsonl<ReviewItem>(this.reviewQueuePath);
    const item = items.find((i) => i.id === id);
    if (!item || item.status !== 'pending') return false;

    item.status = 'resolved';
    item.correctIntent = correctIntent;
    item.resolvedAt = new Date().toISOString();
    this.writeJsonl(this.reviewQueuePath, items);

    // Add to corpus
    const corpusPath = this.processor.getCorpusPath(this.groupId);
    const added = this.processor.addToCorpus(item.userMessage, correctIntent, corpusPath);

    if (added) {
      const learned: AutoLearnedItem = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        utterance: item.userMessage,
        intent: correctIntent,
        positiveSignals: 0,
        source: 'admin_review',
      };
      this.appendJsonl(this.autoLearnedPath, learned);
      invalidateEngine(this.groupId);
      logger.info({ utterance: item.userMessage, intent: correctIntent }, 'Admin-resolved and added to corpus');
    }

    return true;
  }

  dismissReviewItem(id: string): boolean {
    const items = this.readJsonl<ReviewItem>(this.reviewQueuePath);
    const item = items.find((i) => i.id === id);
    if (!item || item.status !== 'pending') return false;

    item.status = 'dismissed';
    item.resolvedAt = new Date().toISOString();
    this.writeJsonl(this.reviewQueuePath, items);
    return true;
  }

  getAutoLearnedItems(limit = 50): AutoLearnedItem[] {
    return this.readJsonl<AutoLearnedItem>(this.autoLearnedPath).slice(-limit).reverse();
  }

  getStats(): LearningStats {
    const interactions = this.readJsonl<InteractionLog>(this.interactionsPath);
    const reviewItems = this.readJsonl<ReviewItem>(this.reviewQueuePath);
    const autoLearned = this.readJsonl<AutoLearnedItem>(this.autoLearnedPath);

    // Confidence distribution
    const buckets = [
      { bucket: '0-0.3', min: 0, max: 0.3, count: 0 },
      { bucket: '0.3-0.5', min: 0.3, max: 0.5, count: 0 },
      { bucket: '0.5-0.65', min: 0.5, max: 0.65, count: 0 },
      { bucket: '0.65-0.8', min: 0.65, max: 0.8, count: 0 },
      { bucket: '0.8-1.0', min: 0.8, max: 1.01, count: 0 },
    ];
    for (const i of interactions) {
      const b = buckets.find((b) => i.confidence >= b.min && i.confidence < b.max);
      if (b) b.count++;
    }

    // Recent activity (last 7 days)
    const now = new Date();
    const recentActivity: LearningStats['recentActivity'] = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().slice(0, 10);
      recentActivity.push({
        date: dateStr,
        interactions: interactions.filter((i) => i.timestamp.startsWith(dateStr)).length,
        learned: autoLearned.filter((a) => a.timestamp.startsWith(dateStr)).length,
      });
    }

    return {
      totalInteractions: interactions.length,
      pendingReview: reviewItems.filter((r) => r.status === 'pending').length,
      autoLearned: autoLearned.filter((a) => a.source === 'auto').length,
      resolvedByAdmin: reviewItems.filter((r) => r.status === 'resolved').length,
      confidenceDistribution: buckets.map(({ bucket, count }) => ({ bucket, count })),
      recentActivity,
    };
  }

  processSignals(): { promoted: number; queued: number } {
    const aggregates = this.readSignalAggregates();
    const corpusPath = this.processor.getCorpusPath(this.groupId);
    let promoted = 0;
    const toRemove: string[] = [];

    for (const [utterance, signals] of Object.entries(aggregates)) {
      if (this.processor.shouldAutoPromote(signals)) {
        if (!this.processor.isAlreadyInCorpus(utterance, signals.intent, corpusPath)) {
          const added = this.processor.addToCorpus(utterance, signals.intent, corpusPath);
          if (added) {
            const learned: AutoLearnedItem = {
              id: generateId(),
              timestamp: new Date().toISOString(),
              utterance,
              intent: signals.intent,
              positiveSignals: signals.positive,
              source: 'auto',
            };
            this.appendJsonl(this.autoLearnedPath, learned);
            promoted++;
          }
        }
        toRemove.push(utterance);
      }
    }

    for (const key of toRemove) {
      delete aggregates[key];
    }
    this.writeSignalAggregates(aggregates);

    if (promoted > 0) {
      invalidateEngine(this.groupId);
      logger.info({ promoted, groupId: this.groupId }, 'Auto-learned utterances promoted to corpus');
    }

    return { promoted, queued: Object.keys(aggregates).length };
  }

  // --- File helpers ---

  private appendJsonl<T>(filePath: string, data: T): void {
    try {
      appendFileSync(filePath, JSON.stringify(data) + '\n', 'utf-8');
    } catch (error) {
      logger.error({ error, filePath }, 'Failed to append JSONL');
    }
  }

  private readJsonl<T>(filePath: string): T[] {
    if (!existsSync(filePath)) return [];
    try {
      const content = readFileSync(filePath, 'utf-8').trim();
      if (!content) return [];
      return content.split('\n').map((line) => JSON.parse(line) as T);
    } catch (error) {
      logger.error({ error, filePath }, 'Failed to read JSONL');
      return [];
    }
  }

  private writeJsonl<T>(filePath: string, items: T[]): void {
    try {
      const content = items.map((i) => JSON.stringify(i)).join('\n') + (items.length ? '\n' : '');
      writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      logger.error({ error, filePath }, 'Failed to write JSONL');
    }
  }

  private readSignalAggregates(): Record<string, SignalAggregate> {
    if (!existsSync(this.signalAggregatesPath)) return {};
    try {
      return JSON.parse(readFileSync(this.signalAggregatesPath, 'utf-8'));
    } catch {
      return {};
    }
  }

  private writeSignalAggregates(data: Record<string, SignalAggregate>): void {
    try {
      writeFileSync(this.signalAggregatesPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      logger.error({ error }, 'Failed to write signal aggregates');
    }
  }
}

// Singleton map per group
const services = new Map<string, LearningService>();

export function getLearningService(groupId: string = 'default'): LearningService {
  let svc = services.get(groupId);
  if (!svc) {
    svc = new LearningService(groupId);
    services.set(groupId, svc);
  }
  return svc;
}
