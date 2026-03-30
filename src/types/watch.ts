export type WatchRuleType = "threshold" | "trend" | "anomaly" | "freshness";
export type WatchSeverity = "info" | "warning" | "critical";
export type WatchChannel = "in_app" | "email";

export interface ThresholdCondition {
  column: string;
  operator: "gt" | "lt" | "gte" | "lte" | "eq" | "neq";
  value: number;
}

export interface TrendCondition {
  column: string;
  direction: "reversal" | "decline" | "incline";
  lookbackPoints: number;
}

export interface AnomalyCondition {
  columns: string[] | "all";
  zScoreThreshold: number;
}

export interface FreshnessCondition {
  maxStaleMinutes: number;
}

export interface WatchRule {
  id: string;
  name: string;
  queryName: string;
  groupId: string;
  type: WatchRuleType;
  condition:
    | ThresholdCondition
    | TrendCondition
    | AnomalyCondition
    | FreshnessCondition;
  cronExpression: string;
  channels: WatchChannel[];
  recipients?: string[];
  owner: string;
  enabled: boolean;
  snoozeUntil?: string;
  cooldownMinutes: number;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
  lastTriggeredAt?: string;
}

export interface WatchAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  queryName: string;
  groupId: string;
  type: WatchRuleType;
  severity: WatchSeverity;
  message: string;
  triggeredValue?: string;
  timestamp: string;
  read: boolean;
}

export interface WatchRulesResponse {
  success: boolean;
  data: WatchRule[];
}

export interface WatchAlertsResponse {
  success: boolean;
  data: WatchAlert[];
  unreadCount: number;
}
