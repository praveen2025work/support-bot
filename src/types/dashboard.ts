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
  dashboards: Dashboard[];
  activeDashboardId?: string;
  updatedAt: string;
}

export interface QueryInfo {
  name: string;
  description: string;
  filters: Array<string | { key: string; binding: string }>;
  type: string;
}

// ── Dashboard Grid Types ─────────────────────────────────────────────

/** Grid position for react-grid-layout */
export interface CardLayout {
  i: string; // matches DashboardCard.id
  x: number;
  y: number;
  w: number; // width in grid units (1-12)
  h: number; // height in grid units
  minW?: number;
  minH?: number;
}

/** Cross-card event linking configuration */
export interface EventLinkConfig {
  /** auto: match by column name, manual: explicit mappings, disabled: ignore events */
  mode: "auto" | "manual" | "disabled";
  /** manual mode: { sourceColumn: targetFilter } mappings */
  columnMappings?: Record<string, string>;
  /** columns to ignore even in auto mode */
  ignoreColumns?: string[];
}

/** A single card within a dashboard */
export interface DashboardCard {
  id: string;
  queryName: string;
  groupId: string;
  label: string;
  defaultFilters: Record<string, string>;
  autoRun: boolean;
  eventLink: EventLinkConfig;
  migratedFromFavoriteId?: string;
  createdAt: string;
}

// ── Drill-Down Configuration ────────────────────────────────────────

/** Defines how a column value drills into a sub-query */
export interface DrillDownConfig {
  sourceColumn: string; // column name to make clickable
  targetQuery: string; // query name to execute on click
  targetFilter: string; // filter key to pass the clicked value to
  label?: string; // display label for the drill-down option
}

/** A named, persistent dashboard */
export interface Dashboard {
  id: string; // URL-safe slug
  name: string; // display name
  cards: DashboardCard[];
  layouts: CardLayout[];
  createdAt: string;
  updatedAt: string;
}
