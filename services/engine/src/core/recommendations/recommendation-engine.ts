import { logger } from '@/lib/logger';
import { CoOccurrenceTracker } from './co-occurrence';
import { CollaborativeFilter } from './collaborative-filter';
import { TimePatternAnalyzer } from './time-patterns';
import { UserClustering } from './user-clustering';
import { getInteractionTracker } from './interaction-tracker';
import type { ClassificationResult, ConversationContext } from '../types';

export interface Recommendation {
  type: 'query' | 'document' | 'faq';
  name: string;
  reason: string;
  score: number;
}

// Strategy weights
const CO_OCCURRENCE_WEIGHT = 0.25;
const COLLABORATIVE_WEIGHT = 0.25;
const CONTEXT_WEIGHT = 0.15;
const TIME_WEIGHT = 0.15;
const CLUSTER_WEIGHT = 0.10;
const POPULARITY_WEIGHT = 0.10;

/**
 * ML-enhanced recommendation engine that suggests relevant queries, documents, and FAQs
 * based on co-occurrence analysis, collaborative filtering, time patterns, and user clustering.
 */
export class RecommendationEngine {
  private coTracker: CoOccurrenceTracker;
  private collabFilter: CollaborativeFilter;
  private timeAnalyzer: TimePatternAnalyzer;
  private userClustering: UserClustering;
  private groupId: string;
  private loaded = false;
  private interactionCount = 0;
  private rebuildInterval = 50;

  constructor(groupId: string = 'default') {
    this.groupId = groupId;
    this.coTracker = new CoOccurrenceTracker(groupId);
    this.collabFilter = new CollaborativeFilter(groupId);
    this.timeAnalyzer = new TimePatternAnalyzer(groupId);
    this.userClustering = new UserClustering(groupId);
  }

  /** Ensure all data is loaded */
  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await Promise.all([
      this.coTracker.load(),
      this.collabFilter.load(),
      this.timeAnalyzer.load(),
      this.userClustering.load(),
    ]);
    this.loaded = true;
  }

  /**
   * Rebuild all ML models from interaction data.
   */
  async rebuildModels(): Promise<void> {
    const tracker = getInteractionTracker(this.groupId);
    const interactions = await tracker.readAll();

    if (interactions.length < 3) return;

    this.collabFilter.build(interactions);
    this.timeAnalyzer.build(interactions);
    this.userClustering.build(interactions);

    await Promise.all([
      this.coTracker.build(),
      this.collabFilter.save(),
      this.timeAnalyzer.save(),
      this.userClustering.save(),
    ]);

    logger.info({ groupId: this.groupId, interactions: interactions.length }, 'ML recommendation models rebuilt');
  }

  /**
   * Get recommendations based on current context, classification, and user identity.
   */
  async getRecommendations(
    context: ConversationContext,
    classification: ClassificationResult,
    maxRecommendations: number = 3,
    userId?: string
  ): Promise<Recommendation[]> {
    await this.ensureLoaded();

    // Periodically rebuild all models
    this.interactionCount++;
    if (this.interactionCount % this.rebuildInterval === 0) {
      this.rebuildModels().catch((err) =>
        logger.error({ err }, 'ML model rebuild failed')
      );
    }

    const recommendations: Recommendation[] = [];
    const seen = new Set<string>();

    const sessionQueries = new Set<string>();
    if (context.lastQueryName) sessionQueries.add(context.lastQueryName);

    // 1. Co-occurrence based recommendations
    if (context.lastQueryName) {
      const related = this.coTracker.getRelated(context.lastQueryName, 5);
      for (const r of related) {
        if (sessionQueries.has(r.name) || seen.has(r.name)) continue;
        seen.add(r.name);
        recommendations.push({
          type: 'query',
          name: r.name,
          reason: `Often used with ${context.lastQueryName}`,
          score: r.count * CO_OCCURRENCE_WEIGHT,
        });
      }
    }

    // 2. Collaborative filtering
    if (context.lastQueryName && this.collabFilter.isLoaded) {
      const similar = this.collabFilter.getSimilar(context.lastQueryName, 5);
      for (const s of similar) {
        if (sessionQueries.has(s.name) || seen.has(s.name)) continue;
        seen.add(s.name);
        recommendations.push({
          type: 'query',
          name: s.name,
          reason: 'Popular with similar users',
          score: s.score * COLLABORATIVE_WEIGHT,
        });
      }
    }

    // 3. Context-based recommendations
    const contextRecs = this.getContextRecommendations(classification, context);
    for (const rec of contextRecs) {
      if (seen.has(rec.name)) continue;
      seen.add(rec.name);
      recommendations.push({
        ...rec,
        score: rec.score * CONTEXT_WEIGHT,
      });
    }

    // 4. Time-aware recommendations
    if (this.timeAnalyzer.isLoaded) {
      const now = new Date();
      const timeRecs = this.timeAnalyzer.getTimeRelevant(now.getHours(), now.getDay(), 5);
      for (const tr of timeRecs) {
        if (sessionQueries.has(tr.name) || seen.has(tr.name)) continue;
        seen.add(tr.name);
        recommendations.push({
          type: 'query',
          name: tr.name,
          reason: 'Popular at this time',
          score: tr.score * TIME_WEIGHT,
        });
      }
    }

    // 5. User cluster recommendations
    if (userId && this.userClustering.isLoaded) {
      const clusterRecs = this.userClustering.getClusterRecommendations(userId, 5);
      for (const cr of clusterRecs) {
        if (sessionQueries.has(cr.name) || seen.has(cr.name)) continue;
        seen.add(cr.name);
        recommendations.push({
          type: 'query',
          name: cr.name,
          reason: 'Recommended for your profile',
          score: cr.score * CLUSTER_WEIGHT,
        });
      }
    }

    // 6. General suggestions
    const generalRecs = this.getGeneralRecommendations(sessionQueries);
    for (const rec of generalRecs) {
      if (seen.has(rec.name)) continue;
      seen.add(rec.name);
      recommendations.push({
        ...rec,
        score: rec.score * POPULARITY_WEIGHT,
      });
    }

    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, maxRecommendations);
  }

  private getContextRecommendations(
    classification: ClassificationResult,
    context: ConversationContext
  ): Recommendation[] {
    const recs: Recommendation[] = [];
    const intent = classification.intent;

    if (intent === 'query.execute' && context.lastQueryName) {
      recs.push({ type: 'query', name: 'summarize', reason: 'Summarize the results', score: 0.7 });
      recs.push({ type: 'document', name: 'search documents', reason: 'Find related documentation', score: 0.5 });
    }

    if (intent === 'document.ask' || intent === 'knowledge.search') {
      recs.push({ type: 'query', name: 'list queries', reason: 'See available data queries', score: 0.6 });
    }

    return recs;
  }

  private getGeneralRecommendations(sessionQueries: Set<string>): Recommendation[] {
    const recs: Recommendation[] = [];
    const commonActions = [
      { name: 'list queries', reason: 'Explore available queries', type: 'query' as const },
      { name: 'list documents', reason: 'See uploaded documents', type: 'document' as const },
      { name: 'help', reason: 'Get usage tips', type: 'faq' as const },
    ];

    for (const action of commonActions) {
      if (!sessionQueries.has(action.name)) {
        recs.push({ ...action, score: 0.3 });
      }
    }

    return recs;
  }
}
