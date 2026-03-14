import type { ExtractedEntity } from '../types';

export type FeedbackType = 'suggestion_click' | 'rephrase' | 'retry' | 'normal';

export interface InteractionLog {
  id: string;
  timestamp: string;
  sessionId: string;
  groupId: string;
  userMessage: string;
  intent: string;
  confidence: number;
  source: 'nlp' | 'fuzzy' | 'fuzzy_synonym';
  entities: ExtractedEntity[];
  feedbackType: FeedbackType;
  previousMessageText?: string;
}

export interface ReviewItem {
  id: string;
  timestamp: string;
  userMessage: string;
  detectedIntent: string;
  confidence: number;
  groupId: string;
  status: 'pending' | 'resolved' | 'dismissed';
  correctIntent?: string;
  resolvedAt?: string;
}

export interface AutoLearnedItem {
  id: string;
  timestamp: string;
  utterance: string;
  intent: string;
  positiveSignals: number;
  source: 'auto' | 'admin_review';
}

export interface SignalAggregate {
  intent: string;
  positive: number;
  negative: number;
}

export interface LearningStats {
  totalInteractions: number;
  pendingReview: number;
  autoLearned: number;
  resolvedByAdmin: number;
  confidenceDistribution: { bucket: string; count: number }[];
  recentActivity: { date: string; interactions: number; learned: number }[];
}
