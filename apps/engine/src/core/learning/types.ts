import type { ExtractedEntity } from "../types";

export type FeedbackType =
  | "suggestion_click"
  | "rephrase"
  | "retry"
  | "normal"
  // User clicked a "Did you mean?" disambiguation chip. Distinct from
  // suggestion_click because the *previous* user utterance was ambiguous
  // (not wrong) — we record (previousMessageText → chosen intent) as a
  // POSITIVE signal so the corpus learns the mapping. The current
  // message text (which is the chip's display label / queryName) is not
  // the corpus signal.
  | "disambig_click";

/** Surface where the interaction originated */
export type InteractionSurface =
  | "chat"
  | "dashboard"
  | "gridboard"
  | "widget"
  | "admin";

export interface InteractionLog {
  id: string;
  timestamp: string;
  sessionId: string;
  groupId: string;
  userMessage: string;
  intent: string;
  confidence: number;
  source: "nlp" | "fuzzy" | "fuzzy_synonym" | "ensemble" | "pattern";
  entities: ExtractedEntity[];
  feedbackType: FeedbackType;
  previousMessageText?: string;
  /** Which UI surface this interaction came from */
  surface?: InteractionSurface;
  /** User ID for cross-surface tracking */
  userId?: string;
}

export interface ReviewItem {
  id: string;
  timestamp: string;
  userMessage: string;
  detectedIntent: string;
  confidence: number;
  groupId: string;
  status: "pending" | "resolved" | "dismissed";
  correctIntent?: string;
  resolvedAt?: string;
  /** Priority score (higher = more urgent): based on frequency and recency */
  priority?: number;
}

export interface AutoLearnedItem {
  id: string;
  timestamp: string;
  utterance: string;
  intent: string;
  positiveSignals: number;
  source: "auto" | "admin_review";
}

export interface SignalAggregate {
  intent: string;
  positive: number;
  negative: number;
  /** ISO timestamp of the last signal (for temporal decay) */
  lastSignalAt?: string;
}

export interface LearningStats {
  totalInteractions: number;
  pendingReview: number;
  autoLearned: number;
  resolvedByAdmin: number;
  confidenceDistribution: { bucket: string; count: number }[];
  recentActivity: { date: string; interactions: number; learned: number }[];
  /** Interaction counts by surface */
  surfaceBreakdown?: Record<InteractionSurface, number>;
}
