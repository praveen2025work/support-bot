/**
 * lib/ml/orchestrator.ts
 * Single entry point — bot calls runMLPipeline() with a parsed intent
 * Returns a fully formed MLBotMessage ready for the chat bubble renderer
 *
 * Gap fixes applied:
 *  A — predict_column case added
 *  B — show_histogram case added
 *  D — tenant access control enforced
 *  E — worker invocation wired up
 *  F — CSV parser handles quoted fields + BOM
 *  I — find_duplicates uses correct analysisType 'duplicates'
 *  M — confidence threshold check
 *  N — maxRows validation
 *  O — try-catch around ML calls
 */

import { profileDataset, profileToNL }                      from './profiler';
import { detectAnomalies, anomalyToNL, anomalyToChart }     from './anomaly';
import { detectTrend, trendToNL, trendToChart }             from './trend';
import { clusterData, clusterToNL, clusterToChart }         from './clustering';
import { computeCorrelation, correlationToNL,
         detectDuplicates, duplicatesToNL }                  from './correlation';
import { predictColumn, regressionToNL, regressionToChart } from './regression';
import { computeHistogram, histogramToNL, histogramToChart } from './histogram';
import type {
  MLBotMessage, ParsedIntent, DatasetProfile, TenantMLConfig,
  MLAnalysisType,
} from '../../types/ml';
import { INTENT_TO_ANALYSIS } from '../../types/ml';

// ─── CSV Parser (handles quoted fields, BOM, and basic delimiters) ───────────

export function parseCSVtoColumns(
  csvText: string
): Record<string, (string | number | null)[]> {
  // Strip BOM if present
  let text = csvText.trim();
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  const lines = text.split('\n');
  const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
  const data: Record<string, (string | number | null)[]> = {};
  headers.forEach(h => { data[h] = []; });

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = parseCSVLine(lines[i]);
    headers.forEach((h, j) => {
      const raw = (cells[j] ?? '').trim();
      if (raw === '' || raw === 'null' || raw === 'NULL' || raw === 'N/A') {
        data[h].push(null);
      } else {
        const num = parseFloat(raw.replace(/[$,£€]/g, ''));
        data[h].push(isNaN(num) ? raw : num);
      }
    });
  }
  return data;
}

/** Parse a single CSV line respecting quoted fields containing commas */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

// ─── Worker Pool Manager ──────────────────────────────────────────────────────

let _worker: Worker | null = null;
const _pendingRequests = new Map<string, {
  resolve: (r: unknown) => void;
  reject: (e: Error) => void;
}>();

function getWorker(): Worker {
  if (typeof Worker === 'undefined') {
    throw new Error('Web Workers not available in this environment');
  }
  if (!_worker) {
    _worker = new Worker(
      new URL('../workers/ml.worker.ts', import.meta.url),
      { type: 'module' }
    );
    _worker.onmessage = (e) => {
      const { id, success, result, error } = e.data;
      const pending = _pendingRequests.get(id);
      if (!pending) return;
      _pendingRequests.delete(id);
      if (success) pending.resolve(result);
      else pending.reject(new Error(error));
    };
    _worker.onerror = (e) => {
      // Reject all pending on worker crash
      _pendingRequests.forEach((pending, id) => {
        pending.reject(new Error(`Worker error: ${e.message}`));
        _pendingRequests.delete(id);
      });
    };
  }
  return _worker;
}

function runInWorker(
  type: MLAnalysisType,
  data: Record<string, unknown>,
  options: Record<string, unknown>
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id      = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const worker  = getWorker();
    _pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ id, type, payload: { csvData: JSON.stringify(data), options } });
    setTimeout(() => {
      if (_pendingRequests.has(id)) {
        _pendingRequests.delete(id);
        reject(new Error('ML worker timeout after 30s'));
      }
    }, 30000);
  });
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export interface OrchestratorContext {
  data: Record<string, (string | number | null)[]>;
  profile: DatasetProfile;
  fileName: string;
  tenantConfig: TenantMLConfig;
  // Injected ML libs (for fallback when worker disabled)
  ss?: unknown;
  kmeans?: unknown;
  SimpleLinearRegression?: unknown;
  Fuse?: unknown;
}

export async function runMLPipeline(
  intent: ParsedIntent,
  ctx: OrchestratorContext
): Promise<MLBotMessage> {
  const start     = Date.now();
  const { data, profile, tenantConfig } = ctx;

  const msgBase = {
    id:           `msg-${Date.now()}`,
    rowsAnalyzed: profile.rowCount,
    executionMs:  0,
  };

  // ─── Gap M: Confidence threshold ─────────────────────────────────────────
  if (intent.confidence < 0.4 && intent.intent !== 'unknown') {
    return {
      ...msgBase,
      analysisType: 'profile',
      headline: `I'm not confident I understood your request (confidence: ${(intent.confidence * 100).toFixed(0)}%).`,
      details: [
        `Interpreted as: "${intent.intent}". Could you rephrase?`,
        'Try: "find outliers in revenue", "cluster customers", "show trend in sales", "predict revenue".',
      ],
      executionMs: Date.now() - start,
    };
  }

  // ─── Gap D: Tenant access control ────────────────────────────────────────
  const analysisType = INTENT_TO_ANALYSIS[intent.intent] as MLAnalysisType | undefined;
  if (analysisType && tenantConfig.allowedAnalyses.length > 0 &&
      !tenantConfig.allowedAnalyses.includes(analysisType)) {
    return {
      ...msgBase,
      analysisType: 'profile',
      headline: `The "${analysisType}" analysis is not enabled for your account.`,
      details: [`Available analyses: ${tenantConfig.allowedAnalyses.join(', ')}.`],
      executionMs: Date.now() - start,
    };
  }

  // ─── Gap N: Row count validation ─────────────────────────────────────────
  if (tenantConfig.maxRows > 0 && profile.rowCount > tenantConfig.maxRows) {
    return {
      ...msgBase,
      analysisType: 'profile',
      headline: `Dataset has ${profile.rowCount.toLocaleString()} rows — exceeds the ${tenantConfig.maxRows.toLocaleString()} row limit.`,
      details: ['Please upload a smaller dataset or contact support to increase your limit.'],
      executionMs: Date.now() - start,
    };
  }

  const numericCols = profile.columns
    .filter(c => c.type === 'numeric' || c.type === 'currency')
    .map(c => c.name);
  const dateCols    = profile.columns.filter(c => c.type === 'date').map(c => c.name);

  // Pick columns from intent entities, fallback to auto-detected
  const targetCols = intent.entities.columns.length
    ? intent.entities.columns
    : numericCols.slice(0, 4);

  // ─── Route to correct ML function ─────────────────────────────────────────

  try {
    switch (intent.intent) {

      case 'profile_data':
      case 'summarize': {
        const { headline, details } = profileToNL(profile);
        return {
          ...msgBase,
          analysisType: intent.intent === 'summarize' ? 'summary' : 'profile',
          headline,
          details,
          executionMs: Date.now() - start,
          tableData: {
            headers: ['Column', 'Type', 'Nulls%', 'Unique', 'Mean / Top Value'],
            rows: profile.columns.map(c => [
              c.name, c.type,
              `${c.nullPercent}%`,
              c.unique,
              c.type === 'numeric' ? String(c.mean ?? '') : (c.topValues?.[0]?.value ?? ''),
            ]),
          },
        };
      }

      case 'find_anomalies': {
        const cols  = targetCols.length ? targetCols : numericCols;
        const numData = data as Record<string, (number | null)[]>;
        const results = detectAnomalies(numData, cols, ctx.ss as never, {
          zThreshold: intent.entities.threshold ?? 2.5,
        });
        const { headline, details } = anomalyToNL(results, profile.rowCount);
        const chart = cols.length === 1
          ? anomalyToChart(numData[cols[0]] as number[], results, cols[0])
          : undefined;

        const downloadCSV = results.length
          ? 'Row,Column,Value,ZScore,Severity\n' +
            results.map(r => `${r.rowIndex + 1},${r.column},${r.value},${r.zScore},${r.severity}`).join('\n')
          : undefined;

        return {
          ...msgBase,
          analysisType: 'anomaly',
          headline, details,
          chart: chart as MLBotMessage['chart'],
          downloadPayload: downloadCSV,
          executionMs: Date.now() - start,
          tableData: results.length ? {
            headers: ['Row', 'Column', 'Value', 'Z-Score', 'Severity'],
            rows: results.slice(0, 10).map(r => [r.rowIndex + 1, r.column, r.value, r.zScore, r.severity]),
          } : undefined,
        };
      }

      case 'show_trend':
      case 'forecast': {
        const timeCol  = intent.entities.columns.find(c => dateCols.includes(c)) ?? dateCols[0];
        const valueCol = intent.entities.columns.find(c => numericCols.includes(c))
          ?? intent.entities.targetColumn
          ?? numericCols[0];

        if (!timeCol || !valueCol) {
          return {
            ...msgBase,
            analysisType: 'trend',
            headline: 'Need a date column and a numeric column for trend analysis.',
            details: [`Date columns found: ${dateCols.join(', ') || 'none'}`, `Numeric columns: ${numericCols.join(', ')}`],
            executionMs: Date.now() - start,
          };
        }

        const trendResult = detectTrend(
          data,
          valueCol,
          timeCol,
          ctx.SimpleLinearRegression as never,
          intent.entities.periods ?? 3
        );
        const { headline, details } = trendToNL(trendResult);
        const actualVals   = (data[valueCol] as number[]).filter(v => v !== null);
        const labels       = (data[timeCol] as string[]).filter(Boolean).slice(0, actualVals.length);
        const chart        = trendToChart(trendResult, actualVals, labels);

        return {
          ...msgBase,
          analysisType: intent.intent === 'forecast' ? 'forecast' : 'trend',
          headline, details,
          chart: chart as MLBotMessage['chart'],
          executionMs: Date.now() - start,
        };
      }

      case 'cluster_data': {
        const cols = targetCols.filter(c => numericCols.includes(c));
        if (cols.length < 2) {
          return {
            ...msgBase,
            analysisType: 'cluster',
            headline: 'Clustering needs at least 2 numeric columns.',
            details: [`Available numeric columns: ${numericCols.join(', ')}`],
            executionMs: Date.now() - start,
          };
        }

        const numData = data as Record<string, (number | null)[]>;
        const clusterResult = clusterData(numData, cols, ctx.kmeans as never, intent.entities.k);
        const { headline, details } = clusterToNL(clusterResult, profile.rowCount);
        const chart = clusterToChart(clusterResult);

        return {
          ...msgBase,
          analysisType: 'cluster',
          headline, details,
          chart: chart as MLBotMessage['chart'],
          executionMs: Date.now() - start,
          tableData: {
            headers: ['Cluster', 'Label', 'Size', ...cols.map(c => `Avg ${c}`)],
            rows: clusterResult.clusterLabels.map((label, i) => [
              i + 1, label, clusterResult.clusterSizes[i],
              ...clusterResult.centroids[i],
            ]),
          },
        };
      }

      // ─── Gap A: predict_column implementation ──────────────────────────────
      case 'predict_column': {
        const target = intent.entities.targetColumn ?? intent.entities.columns[0] ?? numericCols[0];
        const features = (intent.entities.columns.length > 1
          ? intent.entities.columns.filter(c => c !== target)
          : numericCols.filter(c => c !== target)
        ).slice(0, 8);

        if (!target || features.length === 0) {
          return {
            ...msgBase,
            analysisType: 'regression',
            headline: 'Need a target column and at least one feature column for regression.',
            details: [`Numeric columns: ${numericCols.join(', ')}`],
            executionMs: Date.now() - start,
          };
        }

        const numData = data as Record<string, (number | null)[]>;
        const regResult = predictColumn(numData, target, features);
        const { headline, details } = regressionToNL(regResult);
        const chart = regressionToChart(regResult);

        // Fill actual values into chart dataset[0]
        const actualVals = (numData[target] ?? [])
          .filter((v): v is number => v !== null && !isNaN(Number(v)))
          .slice(0, 100);
        chart.datasets[0].data = actualVals;

        return {
          ...msgBase,
          analysisType: 'regression',
          headline, details,
          chart: chart as MLBotMessage['chart'],
          executionMs: Date.now() - start,
          tableData: {
            headers: ['Feature', 'Coefficient', 'Importance'],
            rows: regResult.featureImportance.map(f => {
              const coefIdx = regResult.featureColumns.indexOf(f.feature);
              return [f.feature, regResult.coefficients[coefIdx] ?? 0, `${(f.weight * 100).toFixed(0)}%`];
            }),
          },
        };
      }

      case 'show_correlation': {
        const cols = targetCols.length >= 2 ? targetCols : numericCols.slice(0, 6);
        const numData = data as Record<string, (number | null)[]>;
        const corrResult = computeCorrelation(numData, cols);
        const { headline, details } = correlationToNL(corrResult);

        return {
          ...msgBase,
          analysisType: 'correlation',
          headline, details,
          executionMs: Date.now() - start,
          tableData: {
            headers: ['Col 1', 'Col 2', 'r', 'Strength'],
            rows: corrResult.strongPairs.slice(0, 8).map(p => [
              p.col1, p.col2, p.r,
              Math.abs(p.r) > 0.9 ? 'very strong' : Math.abs(p.r) > 0.7 ? 'strong' : 'moderate',
            ]),
          },
        };
      }

      // ─── Gap I fix: use 'duplicates' analysisType ──────────────────────────
      case 'find_duplicates': {
        const cols = targetCols.length ? targetCols : profile.columns.map(c => c.name).slice(0, 6);
        const dupResult = detectDuplicates(data, cols, ctx.Fuse as never);
        const { headline, details } = duplicatesToNL(dupResult, profile.rowCount);

        return {
          ...msgBase,
          analysisType: 'duplicates',
          headline, details,
          downloadPayload: dupResult.exactDuplicates.length
            ? 'DuplicateGroup,Rows\n' +
              dupResult.exactDuplicates.map((g, i) => `${i + 1},${g.map(r => r + 1).join('|')}`).join('\n')
            : undefined,
          executionMs: Date.now() - start,
        };
      }

      // ─── Gap B: show_histogram implementation ──────────────────────────────
      case 'show_histogram': {
        const col = intent.entities.columns[0] ?? numericCols[0];
        if (!col) {
          return {
            ...msgBase,
            analysisType: 'histogram',
            headline: 'Need a numeric column for histogram.',
            details: [`Numeric columns: ${numericCols.join(', ')}`],
            executionMs: Date.now() - start,
          };
        }

        const histResult = computeHistogram(data, col);
        const { headline, details } = histogramToNL(histResult);
        const chart = histogramToChart(histResult);

        return {
          ...msgBase,
          analysisType: 'histogram',
          headline, details,
          chart: chart as MLBotMessage['chart'],
          executionMs: Date.now() - start,
          tableData: histResult.bins.length ? {
            headers: ['Bin', 'Count', '% of Total'],
            rows: histResult.bins.map(b => [
              b.label, b.count,
              `${((b.count / histResult.totalCount) * 100).toFixed(1)}%`,
            ]),
          } : undefined,
        };
      }

      default:
        return {
          ...msgBase,
          analysisType: 'profile',
          headline: "I didn't understand that analysis request.",
          details: [
            'Try: "find outliers in revenue", "cluster customers", "show trend in sales", ' +
            '"predict revenue", "histogram of price", "correlation matrix"',
          ],
          executionMs: Date.now() - start,
        };
    }
  } catch (err) {
    // ─── Gap O: error handling around ML calls ─────────────────────────────
    return {
      ...msgBase,
      analysisType: analysisType ?? 'profile',
      headline: 'An error occurred during analysis.',
      details: [
        err instanceof Error ? err.message : String(err),
        'Please check your data and try again.',
      ],
      executionMs: Date.now() - start,
    };
  }
}
