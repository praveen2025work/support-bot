import { logger } from '@/lib/logger';
import { CoOccurrenceTracker } from './co-occurrence';
import type { ClassificationResult, ConversationContext } from '../types';

export interface Recommendation {
  type: 'query' | 'document' | 'faq';
  name: string;
  reason: string;
  score: number;
}

// Strategy weights
const CO_OCCURRENCE_WEIGHT = 0.5;
const CONTEXT_WEIGHT = 0.3;
const POPULARITY_WEIGHT = 0.2;

/**
 * Recommendation engine that suggests relevant queries, documents, and FAQs
 * based on user behavior and session context. No ML model needed —
 * uses co-occurrence analysis, context matching, and popularity.
 */
export class RecommendationEngine {
  private coTracker: CoOccurrenceTracker;
  private groupId: string;
  private loaded = false;
  private interactionCount = 0;
  private rebuildInterval = 50; // Rebuild co-occurrence every N interactions

  constructor(groupId: string = 'default') {
    this.groupId = groupId;
    this.coTracker = new CoOccurrenceTracker(groupId);
  }

  /** Ensure co-occurrence data is loaded */
  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await this.coTracker.load();
    this.loaded = true;
  }

  /**
   * Get recommendations based on current context and classification.
   */
  async getRecommendations(
    context: ConversationContext,
    classification: ClassificationResult,
    maxRecommendations: number = 3
  ): Promise<Recommendation[]> {
    await this.ensureLoaded();

    // Periodically rebuild co-occurrence matrix
    this.interactionCount++;
    if (this.interactionCount % this.rebuildInterval === 0) {
      this.coTracker.build().catch((err) =>
        logger.error({ err }, 'Co-occurrence rebuild failed')
      );
    }

    const recommendations: Recommendation[] = [];
    const seen = new Set<string>();

    // Extract what queries were already used in this session
    const sessionQueries = new Set<string>();
    for (const h of context.history) {
      if (h.role === 'user') {
        // Simple heuristic: track if a query was mentioned
        if (context.lastQueryName) sessionQueries.add(context.lastQueryName);
      }
    }

    // 1. Co-occurrence based recommendations
    if (context.lastQueryName) {
      const related = this.coTracker.getRelated(context.lastQueryName, 5);
      for (const r of related) {
        if (sessionQueries.has(r.name)) continue;
        if (seen.has(r.name)) continue;
        seen.add(r.name);
        recommendations.push({
          type: 'query',
          name: r.name,
          reason: `Often used with ${context.lastQueryName}`,
          score: r.count * CO_OCCURRENCE_WEIGHT,
        });
      }
    }

    // 2. Context-based recommendations — suggest related intents
    const contextRecs = this.getContextRecommendations(classification, context);
    for (const rec of contextRecs) {
      if (seen.has(rec.name)) continue;
      seen.add(rec.name);
      recommendations.push({
        ...rec,
        score: rec.score * CONTEXT_WEIGHT,
      });
    }

    // 3. General suggestions based on what hasn't been tried
    const generalRecs = this.getGeneralRecommendations(sessionQueries);
    for (const rec of generalRecs) {
      if (seen.has(rec.name)) continue;
      seen.add(rec.name);
      recommendations.push({
        ...rec,
        score: rec.score * POPULARITY_WEIGHT,
      });
    }

    // Sort by score and return top N
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, maxRecommendations);
  }

  private getContextRecommendations(
    classification: ClassificationResult,
    context: ConversationContext
  ): Recommendation[] {
    const recs: Recommendation[] = [];
    const intent = classification.intent;

    // If they just ran a query, suggest related actions
    if (intent === 'query.execute' && context.lastQueryName) {
      recs.push({
        type: 'query',
        name: 'summarize',
        reason: 'Summarize the results',
        score: 0.7,
      });

      // Suggest document search if they seem to want more info
      recs.push({
        type: 'document',
        name: 'search documents',
        reason: 'Find related documentation',
        score: 0.5,
      });
    }

    // If they searched documents, suggest running a query
    if (intent === 'document.ask' || intent === 'knowledge.search') {
      recs.push({
        type: 'query',
        name: 'list queries',
        reason: 'See available data queries',
        score: 0.6,
      });
    }

    return recs;
  }

  private getGeneralRecommendations(
    sessionQueries: Set<string>
  ): Recommendation[] {
    const recs: Recommendation[] = [];

    // Suggest common actions if not tried
    const commonActions = [
      { name: 'list queries', reason: 'Explore available queries', type: 'query' as const },
      { name: 'list documents', reason: 'See uploaded documents', type: 'document' as const },
      { name: 'help', reason: 'Get usage tips', type: 'faq' as const },
    ];

    for (const action of commonActions) {
      if (!sessionQueries.has(action.name)) {
        recs.push({
          ...action,
          score: 0.3,
        });
      }
    }

    return recs;
  }
}
