export interface EvaluationResult {
  triggered: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
  triggeredValue?: string;
}

export interface ThresholdCondition {
  column: string;
  operator: "gt" | "lt" | "gte" | "lte" | "eq" | "neq";
  value: number;
}

export interface AnomalyCondition {
  columns: "all" | string[];
  zScoreThreshold: number;
}

export interface AnomalyResult {
  column: string;
  zScore: number;
  value: number;
  severity: string;
}

export interface FreshnessCondition {
  maxStaleMinutes: number;
}

export interface TrendCondition {
  column: string;
  direction: "reversal" | "decline" | "incline";
  lookbackPoints: number;
}

export class WatchEvaluator {
  evaluateThreshold(
    data: Record<string, number>[],
    condition: ThresholdCondition,
  ): EvaluationResult {
    for (const row of data) {
      const actual = row[condition.column];
      if (actual === undefined) continue;

      if (this.compareValue(actual, condition.operator, condition.value)) {
        return {
          triggered: true,
          severity: "critical",
          message: `Column "${condition.column}" value ${actual} ${condition.operator} ${condition.value}`,
          triggeredValue: String(actual),
        };
      }
    }

    return {
      triggered: false,
      severity: "info",
      message: `No threshold breach detected for column "${condition.column}"`,
    };
  }

  evaluateAnomaly(
    anomalies: AnomalyResult[],
    condition: AnomalyCondition,
  ): EvaluationResult {
    const candidates =
      condition.columns === "all"
        ? anomalies
        : anomalies.filter((a) =>
            (condition.columns as string[]).includes(a.column),
          );

    const triggered = candidates.filter(
      (a) => a.zScore >= condition.zScoreThreshold,
    );

    if (triggered.length === 0) {
      return {
        triggered: false,
        severity: "info",
        message: "No anomalies detected above threshold",
      };
    }

    const worst = triggered.reduce((a, b) => (a.zScore >= b.zScore ? a : b));
    const severity =
      worst.zScore >= 4 ? "critical" : worst.zScore >= 3 ? "warning" : "info";

    return {
      triggered: true,
      severity: severity as "info" | "warning" | "critical",
      message: `Anomaly detected in column "${worst.column}": z-score ${worst.zScore.toFixed(2)}, value ${worst.value}`,
      triggeredValue: String(worst.value),
    };
  }

  evaluateFreshness(
    lastRunAt: string,
    condition: FreshnessCondition,
  ): EvaluationResult {
    const lastRun = new Date(lastRunAt).getTime();
    const now = Date.now();
    const minutesElapsed = (now - lastRun) / (1000 * 60);

    if (minutesElapsed <= condition.maxStaleMinutes) {
      return {
        triggered: false,
        severity: "info",
        message: `Data is fresh (${minutesElapsed.toFixed(1)} minutes old)`,
      };
    }

    const severity: "warning" | "critical" =
      minutesElapsed >= condition.maxStaleMinutes * 2 ? "critical" : "warning";

    return {
      triggered: true,
      severity,
      message: `Data is stale: last run was ${minutesElapsed.toFixed(1)} minutes ago (max: ${condition.maxStaleMinutes} minutes)`,
      triggeredValue: minutesElapsed.toFixed(1),
    };
  }

  evaluateTrend(
    previousData: number[],
    currentData: number[],
    condition: TrendCondition,
  ): EvaluationResult {
    const prevSlope = this.linearSlope(previousData);
    const currSlope = this.linearSlope(currentData);

    let triggered = false;

    if (condition.direction === "reversal") {
      triggered =
        (prevSlope > 0 && currSlope < 0) || (prevSlope < 0 && currSlope > 0);
    } else if (condition.direction === "decline") {
      triggered = currSlope < 0;
    } else if (condition.direction === "incline") {
      triggered = currSlope > 0;
    }

    if (!triggered) {
      return {
        triggered: false,
        severity: "info",
        message: `No ${condition.direction} trend detected for column "${condition.column}"`,
      };
    }

    return {
      triggered: true,
      severity: "warning",
      message: `Trend ${condition.direction} detected for column "${condition.column}": previous slope ${prevSlope.toFixed(4)}, current slope ${currSlope.toFixed(4)}`,
    };
  }

  private compareValue(
    actual: number,
    operator: ThresholdCondition["operator"],
    expected: number,
  ): boolean {
    switch (operator) {
      case "gt":
        return actual > expected;
      case "lt":
        return actual < expected;
      case "gte":
        return actual >= expected;
      case "lte":
        return actual <= expected;
      case "eq":
        return actual === expected;
      case "neq":
        return actual !== expected;
      default:
        return false;
    }
  }

  private linearSlope(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const xMean = (n - 1) / 2;
    const yMean = values.reduce((sum, v) => sum + v, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const dx = i - xMean;
      const dy = values[i] - yMean;
      numerator += dx * dy;
      denominator += dx * dx;
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }
}
