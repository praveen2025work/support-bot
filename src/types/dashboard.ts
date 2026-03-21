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

/** Action panel configuration for a query — configured by tenant admin */
export interface QueryActionConfig {
  /** External app URL to open in the ActionPanel */
  url: string;
  /** Display label for the action button (default: "Open Action") */
  label?: string;
  /** Fields from query results/filters to include in the context payload */
  contextFields?: string[];
  /** Static metadata to pass to the external UI */
  metadata?: Record<string, string>;
}

export interface QueryInfo {
  name: string;
  description: string;
  filters: Array<string | { key: string; binding: string }>;
  type: string;
  drillDown?: DrillDownConfig[];
  /** Action panel configuration — if set, ExternalLink icon appears on cards */
  actionConfig?: QueryActionConfig;
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
  /** Display mode: auto (table+chart), table only, or chart only */
  displayMode?: "auto" | "table" | "chart";
  /** When displayMode is "auto", show compact tab toggle instead of stacking both */
  compactAuto?: boolean;
  /** Sticky note / annotation text */
  notes?: string;
  /** Auto-refresh interval in seconds (0 or undefined = off) */
  refreshIntervalSec?: number;
  /** Enable STOMP WebSocket live refresh for this card */
  stompEnabled?: boolean;
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

// ── Data Validation ──────────────────────────────────────────────

export interface ValidationRule {
  id: string;
  column: string;
  type: "required" | "min" | "max" | "regex" | "enum" | "unique";
  value?: string;
  message?: string;
}

// ── Change History ──────────────────────────────────────────────

export interface ChangeEntry {
  id: string;
  timestamp: string;
  userId: string;
  rowIndex: number;
  column: string;
  oldValue: string;
  newValue: string;
}

// ── Grid Board View Preferences ──────────────────────────────────

export interface ConditionalFormatRule {
  id: string;
  column: string;
  operator: "gt" | "lt" | "eq" | "neq" | "contains" | "between";
  value: string;
  value2?: string;
  style: { bg?: string; color?: string; bold?: boolean };
}

/** Formula column definition */
export interface FormulaColumn {
  id: string;
  name: string;
  /** Expression with {column_name} references, e.g. "{revenue} - {cost}" */
  expression: string;
}

/** Sparkline column configuration */
export interface SparklineConfig {
  column: string;
  type: "line" | "bar";
  color?: string;
}

export interface GridBoardView {
  id: string;
  queryName: string;
  viewName: string;
  columnOrder: string[];
  hiddenColumns: string[];
  columnWidths: Record<string, number>;
  pinnedColumns: string[];
  sortConfig: Array<{ column: string; direction: "asc" | "desc" }>;
  groupByColumn?: string;
  clientFilters: Record<string, { operator: string; value: string }>;
  pageSize: number;
  conditionalFormats: ConditionalFormatRule[];
  /** Formula (computed) columns */
  formulaColumns?: FormulaColumn[];
  /** Sparkline column configs */
  sparklineColumns?: SparklineConfig[];
  /** Per-column aggregation types for footer bar */
  columnAggregations?: Record<string, string>;
  /** Data validation rules */
  validationRules?: ValidationRule[];
  /** Frozen row indices */
  frozenRowIndices?: number[];
  createdAt: string;
  updatedAt: string;
}

// ── Dashboard Tabs ──────────────────────────────────────────────────

/** A tab within a dashboard — cards are assigned to tabs */
export interface DashboardTab {
  id: string;
  name: string;
  /** Card IDs that belong to this tab */
  cardIds: string[];
  order: number;
}

// ── Dashboard Sharing ──────────────────────────────────────────────

export interface DashboardShareEntry {
  userId: string;
  permission: "view" | "edit";
}

export interface DashboardSharing {
  isPublic?: boolean;
  sharedWith: DashboardShareEntry[];
  ownerId: string;
}

// ── Filter Dependency Chains ────────────────────────────────────────

export interface FilterDependency {
  parentFilter: string;
  childFilter: string;
  /** Optional URL to fetch child options based on parent value */
  sourceUrl?: string;
}

// ── Dashboard Parameters ─────────────────────────────────────────────

export interface DashboardParameter {
  id: string;
  name: string;
  label: string;
  type: "text" | "select" | "date" | "daterange" | "number";
  defaultValue: string;
  options?: string[];
  min?: number;
  max?: number;
}

// ── KPI Card Configuration ───────────────────────────────────────────

export interface KpiCardConfig {
  title: string;
  queryName: string;
  valueField: string;
  previousValueField?: string;
  unit?: string;
  prefix?: string;
  format?: "number" | "currency" | "percent";
  thresholds?: { warning: number; danger: number };
  trendLabel?: string;
}

/** A named, persistent dashboard */
export interface Dashboard {
  id: string; // URL-safe slug
  name: string; // display name
  cards: DashboardCard[];
  layouts: CardLayout[];
  simpleMode?: boolean; // read-only reporting mode — hides interactive features
  /** Global auto-refresh interval in seconds for all cards (0 or undefined = off) */
  globalRefreshSec?: number;
  /** Dashboard tabs — optional; if present, cards are organized into tabs */
  tabs?: DashboardTab[];
  /** Currently active tab ID */
  activeTabId?: string;
  /** Sharing configuration */
  sharing?: DashboardSharing;
  /** Filter dependency chains */
  filterDependencies?: FilterDependency[];
  /** Master toggle for STOMP WebSocket live notifications on this dashboard */
  stompEnabled?: boolean;
  /** Dashboard parameters for global filters */
  parameters?: DashboardParameter[];
  /** KPI scorecard cards at the top of the dashboard */
  kpiCards?: KpiCardConfig[];
  createdAt: string;
  updatedAt: string;
}
