export interface BriefingSummary {
  anomaliesDetected: number;
  watchAlertsTriggered: number;
  topQueryName?: string;
  topQueryCount?: number;
  lastLoginAt?: string;
  generatedAt: string;
  message: string;
}

export interface PinnedKpi {
  id: string;
  queryName: string;
  groupId: string;
  valueField: string;
  label: string;
  format?: "number" | "currency" | "percent";
  prefix?: string;
  unit?: string;
}

export interface SuggestedQuery {
  queryName: string;
  reason: string;
  score: number;
}

export interface RecentQueryItem {
  queryName: string;
  groupId: string;
  userMessage: string;
  filters?: Record<string, string>;
  rowCount?: number;
  timestamp: string;
}

export interface HomeFeedData {
  briefing: BriefingSummary;
  suggestedQueries: SuggestedQuery[];
  recentActivity: RecentQueryItem[];
}

export interface HomeFeedResponse {
  success: boolean;
  data: HomeFeedData;
}

export interface FeedSettings {
  pinnedKpis: PinnedKpi[];
  showBriefing: boolean;
  showSuggestions: boolean;
  showRecentActivity: boolean;
}
