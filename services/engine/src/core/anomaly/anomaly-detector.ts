import { promises as fs } from 'fs';
import { dirname } from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { logger } from '@/lib/logger';
import { paths } from '@/lib/env-config';
import { extractNumericColumns, computeColumnStats, zScore, isIqrOutlier, aggregateColumn } from './numeric-utils';
import type { MetricBaseline, AnomalyResult, AnomalyConfig, QueryResultSnapshot } from './types';

const DEFAULT_CONFIG: AnomalyConfig = {
  enabled: true,
  zScoreWarning: 2.0,
  zScoreCritical: 3.0,
  minSamples: 5,
  trackedColumns: [],
};

/**
 * Detects anomalies in query results by comparing numeric values
 * against historical baselines using z-score and IQR methods.
 */
export class AnomalyDetector {
  private baselines: Map<string, MetricBaseline[]> = new Map();
  private config: AnomalyConfig = { ...DEFAULT_CONFIG };
  private groupId: string;
  private loaded = false;

  constructor(groupId: string) {
    this.groupId = groupId;
  }

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await Promise.all([this.loadBaselines(), this.loadConfig()]);
    this.loaded = true;
  }

  /**
   * Record a snapshot of query results for baseline building.
   */
  async recordSnapshot(queryName: string, data: Record<string, unknown>[]): Promise<void> {
    if (!this.config.enabled || data.length === 0) return;

    const numericCols = this.config.trackedColumns.length > 0
      ? this.config.trackedColumns.filter((c) => extractNumericColumns(data).includes(c))
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
    await fs.appendFile(filePath, JSON.stringify(snapshot) + '\n', 'utf-8');
  }

  /**
   * Check for anomalies in current query results against baselines.
   */
  async checkAnomalies(queryName: string, data: Record<string, unknown>[]): Promise<AnomalyResult[]> {
    await this.ensureLoaded();
    if (!this.config.enabled || data.length === 0) return [];

    const baselines = this.baselines.get(queryName);
    if (!baselines || baselines.length === 0) return [];

    const numericCols = extractNumericColumns(data);
    const anomalies: AnomalyResult[] = [];

    for (const baseline of baselines) {
      if (!numericCols.includes(baseline.columnName)) continue;
      if (baseline.sampleCount < this.config.minSamples) continue;

      const currentValue = aggregateColumn(data, baseline.columnName);
      const z = zScore(currentValue, baseline.mean, baseline.stdDev);
      const absZ = Math.abs(z);

      if (absZ < this.config.zScoreWarning && !isIqrOutlier(currentValue, baseline.p25, baseline.p75)) {
        continue;
      }

      const direction: 'spike' | 'drop' = z > 0 ? 'spike' : 'drop';
      const severity: 'info' | 'warning' | 'critical' =
        absZ >= this.config.zScoreCritical ? 'critical' :
        absZ >= this.config.zScoreWarning ? 'warning' : 'info';

      const pctChange = baseline.mean !== 0
        ? Math.round(((currentValue - baseline.mean) / Math.abs(baseline.mean)) * 100)
        : 0;

      anomalies.push({
        queryName,
        columnName: baseline.columnName,
        currentValue: Math.round(currentValue * 100) / 100,
        expectedMean: Math.round(baseline.mean * 100) / 100,
        zScore: Math.round(z * 100) / 100,
        severity,
        direction,
        message: `${baseline.columnName} ${direction === 'spike' ? 'increased' : 'decreased'} by ${Math.abs(pctChange)}% (${severity})`,
      });
    }

    return anomalies;
  }

  /**
   * Rebuild baselines from snapshot history.
   */
  async updateBaselines(): Promise<void> {
    const filePath = paths.data.anomalySnapshots(this.groupId);
    const snapshots = new Map<string, Map<string, number[]>>();

    try {
      const stream = createReadStream(filePath, 'utf-8');
      const rl = createInterface({ input: stream, crlfDelay: Infinity });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const snap: QueryResultSnapshot = JSON.parse(line);
          if (!snapshots.has(snap.queryName)) {
            snapshots.set(snap.queryName, new Map());
          }
          const queryMap = snapshots.get(snap.queryName)!;
          for (const [col, val] of Object.entries(snap.numericSummary)) {
            if (!queryMap.has(col)) queryMap.set(col, []);
            queryMap.get(col)!.push(val);
          }
        } catch { /* skip malformed */ }
      }
    } catch {
      logger.debug({ groupId: this.groupId }, 'No anomaly snapshots found');
      return;
    }

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

    await this.saveBaselines();
    logger.info({ groupId: this.groupId, queries: snapshots.size }, 'Anomaly baselines updated');
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
    await fs.writeFile(filePath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  private async loadBaselines(): Promise<void> {
    try {
      const raw = await fs.readFile(paths.data.anomalyBaselines(this.groupId), 'utf-8');
      const data: MetricBaseline[] = JSON.parse(raw);
      this.baselines.clear();
      for (const b of data) {
        if (!this.baselines.has(b.queryName)) this.baselines.set(b.queryName, []);
        this.baselines.get(b.queryName)!.push(b);
      }
    } catch { /* no baselines yet */ }
  }

  private async saveBaselines(): Promise<void> {
    const all: MetricBaseline[] = [];
    for (const list of this.baselines.values()) all.push(...list);
    const filePath = paths.data.anomalyBaselines(this.groupId);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(all, null, 2), 'utf-8');
  }

  private async loadConfig(): Promise<void> {
    try {
      const raw = await fs.readFile(paths.data.anomalyConfig(this.groupId), 'utf-8');
      this.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch { /* use defaults */ }
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
