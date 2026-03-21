import { promises as fs } from "fs";
import { dirname, join } from "path";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { logger } from "@/lib/logger";
import { paths, DATA_DIR } from "@/lib/env-config";
import { generateId } from "@/lib/generate-id";
import {
  extractNumericColumns,
  computeColumnStats,
  zScore,
  isIqrOutlier,
  aggregateColumn,
} from "./numeric-utils";
import type {
  MetricBaseline,
  SeasonalBaseline,
  AnomalyResult,
  AnomalyConfig,
  AnomalyEvent,
  BusinessRule,
  QueryResultSnapshot,
} from "./types";

const DEFAULT_CONFIG: AnomalyConfig = {
  enabled: true,
  zScoreWarning: 2.0,
  zScoreCritical: 3.0,
  minSamples: 5,
  trackedColumns: [],
  seasonalEnabled: false,
  businessRules: [],
};

/**
 * Detects anomalies in query results by comparing numeric values
 * against historical baselines using z-score, IQR, seasonal adjustment,
 * and user-defined business rules.
 */
export class AnomalyDetector {
  private baselines: Map<string, MetricBaseline[]> = new Map();
  private seasonalBaselines: Map<string, SeasonalBaseline[]> = new Map();
  private config: AnomalyConfig = { ...DEFAULT_CONFIG };
  private groupId: string;
  private loaded = false;

  constructor(groupId: string) {
    this.groupId = groupId;
  }

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await Promise.all([
      this.loadBaselines(),
      this.loadSeasonalBaselines(),
      this.loadConfig(),
    ]);
    this.loaded = true;
  }

  /**
   * Record a snapshot of query results for baseline building.
   */
  async recordSnapshot(
    queryName: string,
    data: Record<string, unknown>[],
  ): Promise<void> {
    if (!this.config.enabled || data.length === 0) return;

    const numericCols =
      this.config.trackedColumns.length > 0
        ? this.config.trackedColumns.filter((c) =>
            extractNumericColumns(data).includes(c),
          )
        : extractNumericColumns(data);

    if (numericCols.length === 0) return;

    const summary: Record<string, number> = {};
    for (const col of numericCols) {
      summary[col] = aggregateColumn(data, col);
    }

    const snapshot: QueryResultSnapshot = {
      queryName,
      timestamp: new Date().toISOString(),
      numericSummary: summary,
    };

    const filePath = paths.data.anomalySnapshots(this.groupId);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, JSON.stringify(snapshot) + "\n", "utf-8");
  }

  /**
   * Check for anomalies in current query results against baselines,
   * seasonal patterns, and business rules.
   */
  async checkAnomalies(
    queryName: string,
    data: Record<string, unknown>[],
  ): Promise<AnomalyResult[]> {
    await this.ensureLoaded();
    if (!this.config.enabled || data.length === 0) return [];

    const numericCols = extractNumericColumns(data);
    const anomalies: AnomalyResult[] = [];

    // 1. Statistical baselines (z-score + IQR)
    const baselines = this.baselines.get(queryName);
    if (baselines && baselines.length > 0) {
      for (const baseline of baselines) {
        if (!numericCols.includes(baseline.columnName)) continue;
        if (baseline.sampleCount < this.config.minSamples) continue;

        const currentValue = aggregateColumn(data, baseline.columnName);
        const z = zScore(currentValue, baseline.mean, baseline.stdDev);
        const absZ = Math.abs(z);

        if (
          absZ < this.config.zScoreWarning &&
          !isIqrOutlier(currentValue, baseline.p25, baseline.p75)
        ) {
          continue;
        }

        const direction: "spike" | "drop" = z > 0 ? "spike" : "drop";
        const severity: "info" | "warning" | "critical" =
          absZ >= this.config.zScoreCritical
            ? "critical"
            : absZ >= this.config.zScoreWarning
              ? "warning"
              : "info";

        const pctChange =
          baseline.mean !== 0
            ? Math.round(
                ((currentValue - baseline.mean) / Math.abs(baseline.mean)) *
                  100,
              )
            : 0;

        anomalies.push({
          queryName,
          columnName: baseline.columnName,
          currentValue: Math.round(currentValue * 100) / 100,
          expectedMean: Math.round(baseline.mean * 100) / 100,
          zScore: Math.round(z * 100) / 100,
          severity,
          direction,
          message: `${baseline.columnName} ${direction === "spike" ? "increased" : "decreased"} by ${Math.abs(pctChange)}% (${severity})`,
          method: "statistical",
        });
      }
    }

    // 2. Seasonal baselines (day-of-week adjustment)
    if (this.config.seasonalEnabled) {
      const dow = new Date().getDay();
      const seasonalKey = `${queryName}:${dow}`;
      const seasonals = this.seasonalBaselines.get(seasonalKey);
      if (seasonals && seasonals.length > 0) {
        for (const sb of seasonals) {
          if (!numericCols.includes(sb.columnName)) continue;
          if (sb.sampleCount < 3) continue; // need at least 3 same-day samples

          const currentValue = aggregateColumn(data, sb.columnName);
          const z = zScore(currentValue, sb.mean, sb.stdDev);
          const absZ = Math.abs(z);

          // Only flag if also exceeding the global threshold
          if (absZ < this.config.zScoreWarning) continue;

          // Check if the statistical baseline already flagged this column
          const alreadyFlagged = anomalies.some(
            (a) => a.columnName === sb.columnName && a.method === "statistical",
          );
          if (alreadyFlagged) continue;

          const direction: "spike" | "drop" = z > 0 ? "spike" : "drop";
          const dayNames = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];

          anomalies.push({
            queryName,
            columnName: sb.columnName,
            currentValue: Math.round(currentValue * 100) / 100,
            expectedMean: Math.round(sb.mean * 100) / 100,
            zScore: Math.round(z * 100) / 100,
            severity:
              absZ >= this.config.zScoreCritical ? "critical" : "warning",
            direction,
            message: `${sb.columnName} is unusual for ${dayNames[dow]}s — ${direction} detected`,
            method: "seasonal",
          });
        }
      }
    }

    // 3. Business rules
    const rules = this.config.businessRules ?? [];
    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (!numericCols.includes(rule.columnName)) continue;

      const currentValue = aggregateColumn(data, rule.columnName);
      const triggered = evaluateBusinessRule(currentValue, rule);
      if (!triggered) continue;

      // Avoid duplicate flags for the same column
      const alreadyFlagged = anomalies.some(
        (a) => a.columnName === rule.columnName,
      );
      if (alreadyFlagged) continue;

      anomalies.push({
        queryName,
        columnName: rule.columnName,
        currentValue: Math.round(currentValue * 100) / 100,
        expectedMean: rule.threshold,
        zScore: 0,
        severity: rule.severity,
        direction: currentValue > rule.threshold ? "spike" : "drop",
        message:
          rule.message ||
          `${rule.columnName} ${rule.operator} ${rule.threshold} (business rule)`,
        method: "business_rule",
      });
    }

    // Log anomaly events to history (fire-and-forget)
    if (anomalies.length > 0) {
      this.logAnomalyEvents(anomalies).catch((err) =>
        logger.debug({ err }, "Failed to log anomaly events"),
      );
    }

    return anomalies;
  }

  /**
   * Rebuild baselines from snapshot history.
   */
  async updateBaselines(): Promise<void> {
    const filePath = paths.data.anomalySnapshots(this.groupId);
    const snapshots = new Map<string, Map<string, number[]>>();
    // For seasonal: key = "queryName:dayOfWeek", value = Map<column, values[]>
    const seasonalData = new Map<string, Map<string, number[]>>();

    try {
      const stream = createReadStream(filePath, "utf-8");
      const rl = createInterface({ input: stream, crlfDelay: Infinity });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const snap: QueryResultSnapshot = JSON.parse(line);
          // Global baselines
          if (!snapshots.has(snap.queryName)) {
            snapshots.set(snap.queryName, new Map());
          }
          const queryMap = snapshots.get(snap.queryName)!;
          for (const [col, val] of Object.entries(snap.numericSummary)) {
            if (!queryMap.has(col)) queryMap.set(col, []);
            queryMap.get(col)!.push(val);
          }

          // Seasonal baselines (by day of week)
          if (this.config.seasonalEnabled && snap.timestamp) {
            const dow = new Date(snap.timestamp).getDay();
            const seasonalKey = `${snap.queryName}:${dow}`;
            if (!seasonalData.has(seasonalKey)) {
              seasonalData.set(seasonalKey, new Map());
            }
            const dayMap = seasonalData.get(seasonalKey)!;
            for (const [col, val] of Object.entries(snap.numericSummary)) {
              if (!dayMap.has(col)) dayMap.set(col, []);
              dayMap.get(col)!.push(val);
            }
          }
        } catch {
          /* skip malformed */
        }
      }
    } catch {
      logger.debug({ groupId: this.groupId }, "No anomaly snapshots found");
      return;
    }

    // Build global baselines
    this.baselines.clear();
    const now = new Date().toISOString();

    for (const [queryName, columns] of snapshots) {
      const baselineList: MetricBaseline[] = [];
      for (const [columnName, values] of columns) {
        const stats = computeColumnStats(values);
        baselineList.push({
          queryName,
          columnName,
          ...stats,
          sampleCount: values.length,
          lastUpdated: now,
        });
      }
      this.baselines.set(queryName, baselineList);
    }

    // Build seasonal baselines
    this.seasonalBaselines.clear();
    for (const [key, columns] of seasonalData) {
      const parts = key.split(":");
      const queryName = parts.slice(0, -1).join(":");
      const dow = parseInt(parts[parts.length - 1], 10);
      const seasonalList: SeasonalBaseline[] = [];
      for (const [columnName, values] of columns) {
        const stats = computeColumnStats(values);
        seasonalList.push({
          queryName,
          columnName,
          dayOfWeek: dow,
          mean: stats.mean,
          stdDev: stats.stdDev,
          sampleCount: values.length,
        });
      }
      this.seasonalBaselines.set(key, seasonalList);
    }

    await Promise.all([this.saveBaselines(), this.saveSeasonalBaselines()]);
    logger.info(
      { groupId: this.groupId, queries: snapshots.size },
      "Anomaly baselines updated",
    );
  }

  /** Get baselines for display */
  getBaselines(queryName?: string): MetricBaseline[] {
    if (queryName) return this.baselines.get(queryName) || [];
    const all: MetricBaseline[] = [];
    for (const list of this.baselines.values()) all.push(...list);
    return all;
  }

  /** Get / set config */
  getConfig(): AnomalyConfig {
    return { ...this.config };
  }

  async setConfig(updates: Partial<AnomalyConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    const filePath = paths.data.anomalyConfig(this.groupId);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(this.config, null, 2), "utf-8");
  }

  // ── Business rule CRUD ─────────────────────────────────────────────

  addBusinessRule(rule: Omit<BusinessRule, "id">): BusinessRule {
    const newRule: BusinessRule = { ...rule, id: generateId() };
    if (!this.config.businessRules) this.config.businessRules = [];
    this.config.businessRules.push(newRule);
    this.setConfig(this.config).catch((err) =>
      logger.error({ err }, "Failed to persist business rule"),
    );
    return newRule;
  }

  removeBusinessRule(ruleId: string): boolean {
    if (!this.config.businessRules) return false;
    const idx = this.config.businessRules.findIndex((r) => r.id === ruleId);
    if (idx === -1) return false;
    this.config.businessRules.splice(idx, 1);
    this.setConfig(this.config).catch((err) =>
      logger.error({ err }, "Failed to persist business rule removal"),
    );
    return true;
  }

  getBusinessRules(): BusinessRule[] {
    return [...(this.config.businessRules ?? [])];
  }

  // ── Anomaly history ────────────────────────────────────────────────

  /** Retrieve anomaly events from the history log. */
  async getHistory(limit = 100, queryName?: string): Promise<AnomalyEvent[]> {
    const historyPath = this.historyPath();
    try {
      await fs.access(historyPath);
    } catch {
      return [];
    }
    try {
      const content = (await fs.readFile(historyPath, "utf-8")).trim();
      if (!content) return [];
      let events: AnomalyEvent[] = content
        .split("\n")
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as AnomalyEvent[];
      if (queryName) {
        events = events.filter((e) => e.queryName === queryName);
      }
      return events.slice(-limit).reverse();
    } catch {
      return [];
    }
  }

  /** Acknowledge an anomaly event. */
  async acknowledgeEvent(eventId: string): Promise<boolean> {
    const historyPath = this.historyPath();
    try {
      const content = (await fs.readFile(historyPath, "utf-8")).trim();
      if (!content) return false;
      const lines = content.split("\n");
      let found = false;
      const updated = lines.map((line) => {
        try {
          const evt: AnomalyEvent = JSON.parse(line);
          if (evt.id === eventId) {
            found = true;
            return JSON.stringify({ ...evt, acknowledged: true });
          }
          return line;
        } catch {
          return line;
        }
      });
      if (!found) return false;
      await fs.writeFile(historyPath, updated.join("\n") + "\n", "utf-8");
      return true;
    } catch {
      return false;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────

  private async logAnomalyEvents(anomalies: AnomalyResult[]): Promise<void> {
    const historyPath = this.historyPath();
    await fs.mkdir(dirname(historyPath), { recursive: true });
    const lines = anomalies.map((a) => {
      const event: AnomalyEvent = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        queryName: a.queryName,
        columnName: a.columnName,
        currentValue: a.currentValue,
        expectedMean: a.expectedMean,
        zScore: a.zScore,
        severity: a.severity,
        direction: a.direction,
        method: a.method ?? "statistical",
        message: a.message,
        acknowledged: false,
      };
      return JSON.stringify(event);
    });
    await fs.appendFile(historyPath, lines.join("\n") + "\n", "utf-8");
  }

  private historyPath(): string {
    return join(DATA_DIR, "anomaly", this.groupId, "history.jsonl");
  }

  private seasonalBaselinesPath(): string {
    return join(DATA_DIR, "anomaly", this.groupId, "seasonal-baselines.json");
  }

  private async loadBaselines(): Promise<void> {
    try {
      const raw = await fs.readFile(
        paths.data.anomalyBaselines(this.groupId),
        "utf-8",
      );
      const data: MetricBaseline[] = JSON.parse(raw);
      this.baselines.clear();
      for (const b of data) {
        if (!this.baselines.has(b.queryName))
          this.baselines.set(b.queryName, []);
        this.baselines.get(b.queryName)!.push(b);
      }
    } catch {
      /* no baselines yet */
    }
  }

  private async loadSeasonalBaselines(): Promise<void> {
    try {
      const raw = await fs.readFile(this.seasonalBaselinesPath(), "utf-8");
      const data: SeasonalBaseline[] = JSON.parse(raw);
      this.seasonalBaselines.clear();
      for (const sb of data) {
        const key = `${sb.queryName}:${sb.dayOfWeek}`;
        if (!this.seasonalBaselines.has(key))
          this.seasonalBaselines.set(key, []);
        this.seasonalBaselines.get(key)!.push(sb);
      }
    } catch {
      /* no seasonal baselines yet */
    }
  }

  private async saveBaselines(): Promise<void> {
    const all: MetricBaseline[] = [];
    for (const list of this.baselines.values()) all.push(...list);
    const filePath = paths.data.anomalyBaselines(this.groupId);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(all, null, 2), "utf-8");
  }

  private async saveSeasonalBaselines(): Promise<void> {
    const all: SeasonalBaseline[] = [];
    for (const list of this.seasonalBaselines.values()) all.push(...list);
    const filePath = this.seasonalBaselinesPath();
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(all, null, 2), "utf-8");
  }

  private async loadConfig(): Promise<void> {
    try {
      const raw = await fs.readFile(
        paths.data.anomalyConfig(this.groupId),
        "utf-8",
      );
      this.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      /* use defaults */
    }
  }
}

// ── Helper ────────────────────────────────────────────────────────────

function evaluateBusinessRule(value: number, rule: BusinessRule): boolean {
  switch (rule.operator) {
    case ">":
      return value > rule.threshold;
    case "<":
      return value < rule.threshold;
    case ">=":
      return value >= rule.threshold;
    case "<=":
      return value <= rule.threshold;
    case "==":
      return value === rule.threshold;
    case "!=":
      return value !== rule.threshold;
    default:
      return false;
  }
}

// Singleton per group
const instances = new Map<string, AnomalyDetector>();

export function getAnomalyDetector(groupId: string): AnomalyDetector {
  let detector = instances.get(groupId);
  if (!detector) {
    detector = new AnomalyDetector(groupId);
    instances.set(groupId, detector);
  }
  return detector;
}
