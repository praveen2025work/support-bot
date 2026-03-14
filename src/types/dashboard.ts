export interface FavoriteItem {
  id: string;
  queryName: string;
  groupId: string;
  label: string;
  defaultFilters: Record<string, string>;
  createdAt: string;
}

export interface SubscriptionItem {
  id: string;
  queryName: string;
  groupId: string;
  label: string;
  defaultFilters: Record<string, string>;
  refreshOnLoad: boolean;
  createdAt: string;
}

export interface RecentQuery {
  queryName: string;
  groupId: string;
  userMessage: string;
  intent: string;
  timestamp: string;
  executionMs?: number;
}

export interface UserPreferences {
  userId: string;
  favorites: FavoriteItem[];
  subscriptions: SubscriptionItem[];
  recentQueries: RecentQuery[];
  updatedAt: string;
}

export interface QueryInfo {
  name: string;
  description: string;
  filters: Array<string | { key: string; binding: string }>;
  type: string;
}
