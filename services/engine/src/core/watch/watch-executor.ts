import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { WatchRuleService, WatchRule, WatchAlert } from "./watch-rule-service";
import {
  WatchEvaluator,
  AnomalyResult,
  ThresholdCondition,
  AnomalyCondition,
  FreshnessCondition,
  TrendCondition,
} from "./watch-evaluator";
import { NotificationService } from "./notification-service";
import { logger } from "@/lib/logger";

const CHECK_INTERVAL_MS = 60_000; // every 60 seconds

export class WatchExecutor {
  private readonly dataDir: string;
  private readonly ruleService: WatchRuleService;
  private readonly evaluator: WatchEvaluator;
  private readonly notifier: NotificationService;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.ruleService = new WatchRuleService(dataDir);
    this.evaluator = new WatchEvaluator();
    this.notifier = new NotificationService();
  }

  start(): void {
    if (this.intervalHandle) return;
    logger.info("WatchExecutor started (checking every 60s)");
    this.intervalHandle = setInterval(
      () => void this.runDueRules(),
      CHECK_INTERVAL_MS,
    );
    // Run once on startup
    void this.runDueRules();
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      logger.info("WatchExecutor stopped");
    }
  }

  async runDueRules(): Promise<void> {
    try {
      const watchDir = path.join(this.dataDir, "watch");
      if (!fs.existsSync(watchDir)) return;

      const groupDirs = fs
        .readdirSync(watchDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const groupId of groupDirs) {
        const rules = this.ruleService.listRules(groupId);
        for (const rule of rules) {
          if (!this.shouldRun(rule)) continue;
          try {
            await this.evaluateRule(groupId, rule);
          } catch (err) {
            logger.error(
              {
                ruleId: rule.id,
                ruleName: rule.name,
                error: (err as Error).message,
              },
              "Error evaluating watch rule",
            );
          }
        }
      }
    } catch (err) {
      logger.error(
        { error: (err as Error).message },
        "WatchExecutor run error",
      );
    }
  }

  private shouldRun(rule: WatchRule): boolean {
    if (!rule.enabled) return false;

    if (rule.snoozeUntil && new Date(rule.snoozeUntil) > new Date()) {
      return false;
    }

    const intervalMs = this.parseCronInterval(rule.cronExpression);
    if (intervalMs <= 0) return false;

    if (!rule.lastCheckedAt) return true;

    const elapsed = Date.now() - new Date(rule.lastCheckedAt).getTime();
    return elapsed >= intervalMs;
  }

  private async evaluateRule(groupId: string, rule: WatchRule): Promise<void> {
    const now = new Date().toISOString();

    // Update lastCheckedAt regardless of trigger
    this.ruleService.updateRule(groupId, rule.id, { lastCheckedAt: now });

    let result: {
      triggered: boolean;
      severity: string;
      message: string;
      triggeredValue?: string;
    };

    switch (rule.type) {
      case "threshold":
        result = this.evaluateThresholdRule(rule);
        break;
      case "anomaly":
        result = this.evaluateAnomalyRule(rule);
        break;
      case "freshness":
        result = this.evaluateFreshnessRule(rule);
        break;
      case "trend":
        result = this.evaluateTrendRule(rule);
        break;
      default:
        logger.warn({ ruleType: rule.type }, "Unknown watch rule type");
        return;
    }

    if (!result.triggered) return;

    // Check cooldown
    if (rule.lastTriggeredAt) {
      const cooldownMs = (rule.cooldownMinutes ?? 60) * 60_000;
      const elapsed = Date.now() - new Date(rule.lastTriggeredAt).getTime();
      if (elapsed < cooldownMs) {
        logger.debug(
          { ruleId: rule.id, ruleName: rule.name },
          "Watch rule in cooldown — skipping notification",
        );
        return;
      }
    }

    const alert: WatchAlert = {
      id: randomUUID(),
      ruleId: rule.id,
      ruleName: rule.name,
      queryName: rule.queryName,
      groupId,
      type: rule.type,
      severity: result.severity,
      message: result.message,
      triggeredValue: result.triggeredValue,
      timestamp: now,
      read: false,
    };

    this.ruleService.addAlert(groupId, alert);
    this.ruleService.updateRule(groupId, rule.id, { lastTriggeredAt: now });

    logger.info(
      { ruleId: rule.id, ruleName: rule.name, severity: result.severity },
      "Watch rule triggered — alert created",
    );

    await this.notifier.notify(
      {
        ruleName: rule.name,
        queryName: rule.queryName,
        severity: result.severity,
        message: result.message,
        triggeredValue: result.triggeredValue,
        timestamp: now,
      },
      { channels: rule.channels, recipients: rule.recipients },
    );
  }

  private evaluateThresholdRule(rule: WatchRule): {
    triggered: boolean;
    severity: string;
    message: string;
    triggeredValue?: string;
  } {
    const condition = rule.condition as unknown as ThresholdCondition;
    const snapshots = this.readSnapshots(rule.groupId, rule.queryName);
    const data = snapshots
      .filter((s) => s.numericSummary)
      .map((s) => s.numericSummary as Record<string, number>);

    if (data.length === 0) {
      return {
        triggered: false,
        severity: "info",
        message: "No data available",
      };
    }

    return this.evaluator.evaluateThreshold(data, condition);
  }

  private evaluateAnomalyRule(rule: WatchRule): {
    triggered: boolean;
    severity: string;
    message: string;
    triggeredValue?: string;
  } {
    const condition = rule.condition as unknown as AnomalyCondition;
    const anomalies = this.readAnomalyHistory(rule.groupId, rule.queryName);

    if (anomalies.length === 0) {
      return {
        triggered: false,
        severity: "info",
        message: "No anomaly data available",
      };
    }

    return this.evaluator.evaluateAnomaly(anomalies, condition);
  }

  private evaluateFreshnessRule(rule: WatchRule): {
    triggered: boolean;
    severity: string;
    message: string;
    triggeredValue?: string;
  } {
    const condition = rule.condition as unknown as FreshnessCondition;
    const snapshots = this.readSnapshots(rule.groupId, rule.queryName);

    if (snapshots.length === 0) {
      return {
        triggered: true,
        severity: "warning",
        message: `No snapshots found for query "${rule.queryName}"`,
      };
    }

    const latest = snapshots[snapshots.length - 1];
    return this.evaluator.evaluateFreshness(
      latest.timestamp as string,
      condition,
    );
  }

  private evaluateTrendRule(rule: WatchRule): {
    triggered: boolean;
    severity: string;
    message: string;
    triggeredValue?: string;
  } {
    const condition = rule.condition as unknown as TrendCondition;
    const snapshots = this.readSnapshots(rule.groupId, rule.queryName);
    const values = snapshots
      .filter(
        (s) =>
          s.numericSummary &&
          (s.numericSummary as Record<string, number>)[condition.column] !==
            undefined,
      )
      .map(
        (s) => (s.numericSummary as Record<string, number>)[condition.column],
      );

    const lookback = condition.lookbackPoints ?? 5;
    if (values.length < lookback * 2) {
      return {
        triggered: false,
        severity: "info",
        message: "Insufficient data for trend analysis",
      };
    }

    const previousData = values.slice(-lookback * 2, -lookback);
    const currentData = values.slice(-lookback);

    return this.evaluator.evaluateTrend(previousData, currentData, condition);
  }

  // ---------------------------------------------------------------------------
  // Data readers
  // ---------------------------------------------------------------------------

  private readSnapshots(
    groupId: string,
    queryName: string,
  ): Array<{ timestamp: unknown; numericSummary?: unknown }> {
    const filePath = path.join(
      this.dataDir,
      "anomaly",
      groupId,
      "snapshots.jsonl",
    );
    if (!fs.existsSync(filePath)) return [];

    return fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => {
        try {
          return JSON.parse(l) as {
            queryName: string;
            timestamp: unknown;
            numericSummary?: unknown;
          };
        } catch {
          return null;
        }
      })
      .filter(
        (
          s,
        ): s is {
          queryName: string;
          timestamp: unknown;
          numericSummary?: unknown;
        } => s !== null && s.queryName === queryName,
      );
  }

  private readAnomalyHistory(
    groupId: string,
    queryName: string,
  ): AnomalyResult[] {
    const filePath = path.join(
      this.dataDir,
      "anomaly",
      groupId,
      "history.jsonl",
    );
    if (!fs.existsSync(filePath)) return [];

    return fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => {
        try {
          return JSON.parse(l) as {
            queryName: string;
            columnName: string;
            currentValue: number;
            zScore: number;
            severity: string;
          };
        } catch {
          return null;
        }
      })
      .filter(
        (
          h,
        ): h is {
          queryName: string;
          columnName: string;
          currentValue: number;
          zScore: number;
          severity: string;
        } => h !== null && h.queryName === queryName,
      )
      .map((h) => ({
        column: h.columnName,
        zScore: h.zScore,
        value: h.currentValue,
        severity: h.severity,
      }));
  }

  // ---------------------------------------------------------------------------
  // Cron parser — supports */N and plain integer (minutes)
  // ---------------------------------------------------------------------------

  parseCronInterval(cron: string): number {
    // Handle */N patterns (e.g. "*/5" = every 5 minutes, "*/60" = every 60 minutes)
    const stepsMatch = cron.match(/^\*\/(\d+)$/);
    if (stepsMatch) {
      return parseInt(stepsMatch[1], 10) * 60_000;
    }

    // Plain integer = minutes
    const plain = parseInt(cron, 10);
    if (!isNaN(plain) && plain > 0) {
      return plain * 60_000;
    }

    // Full cron expression — attempt to parse the minute field's step value
    // e.g. "*/15 * * * *" → 15-minute interval
    const parts = cron.trim().split(/\s+/);
    if (parts.length >= 1) {
      const minuteField = parts[0];
      const m = minuteField.match(/^\*\/(\d+)$/);
      if (m) return parseInt(m[1], 10) * 60_000;
    }

    // Default: 60 minutes if unparseable
    return 60 * 60_000;
  }
}
