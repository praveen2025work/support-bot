import { WatchEvaluator } from "../../../core/watch/watch-evaluator";

describe("WatchEvaluator", () => {
  const evaluator = new WatchEvaluator();

  describe("evaluateThreshold", () => {
    const data = [
      { error_rate: 7.2, count: 100 },
      { error_rate: 3.1, count: 200 },
    ];

    test("triggers when condition met", () => {
      const result = evaluator.evaluateThreshold(data, {
        column: "error_rate",
        operator: "gt",
        value: 5,
      });
      expect(result.triggered).toBe(true);
      expect(result.triggeredValue).toBe("7.2");
      expect(result.severity).toBe("critical");
    });

    test("does not trigger when condition not met", () => {
      const result = evaluator.evaluateThreshold(data, {
        column: "count",
        operator: "lt",
        value: 50,
      });
      expect(result.triggered).toBe(false);
    });
  });

  describe("evaluateAnomaly", () => {
    test("detects anomalies from provided anomaly results", () => {
      const anomalies = [
        { column: "revenue", zScore: 3.5, value: 999, severity: "critical" },
      ];
      const result = evaluator.evaluateAnomaly(anomalies, {
        columns: "all",
        zScoreThreshold: 3.0,
      });
      expect(result.triggered).toBe(true);
      expect(result.message).toContain("revenue");
    });

    test("does not trigger below threshold", () => {
      const anomalies = [
        { column: "revenue", zScore: 1.5, value: 100, severity: "info" },
      ];
      const result = evaluator.evaluateAnomaly(anomalies, {
        columns: "all",
        zScoreThreshold: 3.0,
      });
      expect(result.triggered).toBe(false);
    });
  });

  describe("evaluateFreshness", () => {
    test("triggers when data is stale", () => {
      const lastRun = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const result = evaluator.evaluateFreshness(lastRun, {
        maxStaleMinutes: 120,
      });
      expect(result.triggered).toBe(true);
    });

    test("does not trigger when fresh", () => {
      const lastRun = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const result = evaluator.evaluateFreshness(lastRun, {
        maxStaleMinutes: 120,
      });
      expect(result.triggered).toBe(false);
    });
  });

  describe("evaluateTrend", () => {
    test("detects reversal from positive to negative", () => {
      const previousData = [10, 12, 14, 16, 18, 20, 22];
      const currentData = [22, 20, 18, 16, 14, 12, 10];
      const result = evaluator.evaluateTrend(previousData, currentData, {
        column: "revenue",
        direction: "reversal",
        lookbackPoints: 7,
      });
      expect(result.triggered).toBe(true);
    });

    test("does not trigger when trend continues", () => {
      const previousData = [10, 12, 14, 16, 18, 20, 22];
      const currentData = [22, 24, 26, 28, 30, 32, 34];
      const result = evaluator.evaluateTrend(previousData, currentData, {
        column: "revenue",
        direction: "reversal",
        lookbackPoints: 7,
      });
      expect(result.triggered).toBe(false);
    });
  });
});
