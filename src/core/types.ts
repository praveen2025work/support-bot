export interface ChatMessage {
  id: string;
  text: string;
  sessionId: string;
  platform: 'web' | 'widget' | 'teams';
  groupId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  feedbackType?: 'suggestion_click' | 'rephrase' | 'retry' | 'normal';
  previousMessageText?: string;
  timestamp: Date;
}

export interface ClassificationResult {
  intent: string;
  confidence: number;
  entities: ExtractedEntity[];
  sentiment?: SentimentResult;
  source: 'nlp' | 'fuzzy';
}

export interface ExtractedEntity {
  entity: string;
  value: string;
  resolution?: Record<string, unknown>;
  start: number;
  end: number;
}

export interface SentimentResult {
  score: number;
  comparative: number;
  vote: 'positive' | 'neutral' | 'negative';
}

export interface BotResponse {
  text: string;
  richContent?: RichContent;
  suggestions?: string[];
  sessionId: string;
  intent: string;
  confidence: number;
  executionMs?: number;
  referenceUrl?: string;
}

export interface RichContent {
  type: 'url_list' | 'query_result' | 'multi_query_result' | 'estimation' | 'error' | 'file_content' | 'document_search' | 'csv_table' | 'csv_aggregation' | 'csv_group_by' | 'csv_summary' | 'document_summary' | 'knowledge_search' | 'query_list';
  data: unknown;
}

export interface ConversationContext {
  sessionId: string;
  history: Array<{ role: 'user' | 'bot'; text: string; timestamp: Date }>;
  currentIntent?: string;
  pendingEntities?: Record<string, string>;
  lastApiResult?: unknown;
  lastQueryName?: string;
  lastQueryColumns?: string[];
}
