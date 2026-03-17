import { logger } from '@/lib/logger';
import type { ClassificationResult, BotResponse, ConversationContext } from '../../types';
import { INTENTS } from '../../constants';
import { extractCsvDataFromContext } from './followup-handler';
import { getLastUserText } from './query-handler';

// Lazy-load ML modules to avoid startup cost
async function loadML() {
  return import('../../ml');
}

/**
 * Parse a column name from user text for analysis commands.
 * Handles patterns like "histogram of revenue", "predict status", "forecast sales_amount".
 */
function extractColumnFromText(text: string, headers: string[]): string | null {
  // Pattern: "<command> of/for <column>"
  const ofMatch = text.match(/\b(?:of|for|in|on)\s+(\w[\w\s]*?)(?:\s*$|\s+(?:column|field|data))/i);
  if (ofMatch) {
    const term = ofMatch[1].trim().toLowerCase();
    for (const h of headers) {
      if (h.toLowerCase() === term) return h;
      if (h.toLowerCase().replace(/[_\s]/g, '') === term.replace(/[_\s]/g, '')) return h;
    }
  }
  // Pattern: "<command> <column>" — try last meaningful word
  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  for (const word of words.reverse()) {
    for (const h of headers) {
      if (h.toLowerCase() === word) return h;
      if (h.toLowerCase().replace(/[_\s]/g, '') === word.replace(/[_\s]/g, '')) return h;
    }
  }
  return null;
}

/**
 * Central handler for all analysis/ML intents.
 * Dispatches to the appropriate ML module based on classified intent.
 */
export async function handleAnalysis(
  classification: ClassificationResult,
  context: ConversationContext
): Promise<BotResponse | null> {
  const csvData = extractCsvDataFromContext(context);
  if (!csvData) return null;

  const userText = getLastUserText(context);
  const { intent } = classification;

  try {
    switch (intent) {
      case INTENTS.ANALYSIS_PROFILE:
        return await handleProfile(csvData, context, classification);
      case INTENTS.ANALYSIS_SMART_SUMMARY:
        return await handleSmartSummary(csvData, context, classification);
      case INTENTS.ANALYSIS_CORRELATION:
        return await handleCorrelation(csvData, context, classification);
      case INTENTS.ANALYSIS_DISTRIBUTION:
        return await handleDistribution(csvData, userText, context, classification);
      case INTENTS.ANALYSIS_ANOMALY:
        return await handleAnomaly(csvData, context, classification);
      case INTENTS.ANALYSIS_TREND:
        return await handleTrend(csvData, userText, context, classification);
      case INTENTS.ANALYSIS_DUPLICATES:
        return await handleDuplicates(csvData, context, classification);
      case INTENTS.ANALYSIS_MISSING:
        return await handleMissing(csvData, context, classification);
      case INTENTS.ANALYSIS_CLUSTER:
        return await handleCluster(csvData, context, classification);
      case INTENTS.ANALYSIS_DECISION_TREE:
        return await handleDecisionTree(csvData, userText, context, classification);
      case INTENTS.ANALYSIS_FORECAST:
        return await handleForecast(csvData, userText, context, classification);
      case INTENTS.ANALYSIS_PCA:
        return await handlePCA(csvData, context, classification);
      case INTENTS.ANALYSIS_REPORT:
        return await handleReport(csvData, context, classification);
      default:
        return null;
    }
  } catch (error) {
    logger.error({ error, intent }, 'Analysis handler error');
    return {
      text: 'Sorry, I encountered an error while running the analysis. The data may not be suitable for this type of analysis.',
      sessionId: context.sessionId,
      intent,
      confidence: classification.confidence,
    };
  }
}

// ── Individual analysis handlers ───────────────────────────────────

async function handleProfile(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  context: ConversationContext,
  classification: ClassificationResult
): Promise<BotResponse> {
  const ml = await loadML();
  const profiles = ml.profileColumns(csvData);
  return {
    text: `Here's the column profile for your data (${csvData.rows.length} rows, ${csvData.headers.length} columns):`,
    richContent: { type: 'column_profile', data: profiles },
    suggestions: ['Show correlations', 'Find outliers', 'Smart summary'],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

async function handleSmartSummary(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  context: ConversationContext,
  classification: ClassificationResult
): Promise<BotResponse> {
  const ml = await loadML();
  const result = ml.generateSmartSummary(csvData);
  return {
    text: `**Key Insights** (${result.insights.length} findings):`,
    richContent: { type: 'smart_summary', data: result },
    suggestions: ['Show correlations', 'Find outliers', 'Profile columns'],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

async function handleCorrelation(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  context: ConversationContext,
  classification: ClassificationResult
): Promise<BotResponse> {
  const ml = await loadML();
  const result = ml.computeCorrelationMatrix(csvData);
  if (!result || result.columns.length < 2) {
    return {
      text: 'I need at least 2 numeric columns to compute correlations. This dataset doesn\'t have enough numeric data.',
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
  return {
    text: `**Correlation Matrix** for ${result.columns.length} numeric columns:`,
    richContent: { type: 'correlation_heatmap', data: result },
    suggestions: ['Find outliers', 'Profile columns', 'PCA analysis'],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

async function handleDistribution(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  userText: string,
  context: ConversationContext,
  classification: ClassificationResult
): Promise<BotResponse> {
  const ml = await loadML();
  const column = extractColumnFromText(userText, csvData.headers);
  if (!column) {
    // Try first numeric column
    const numCols = csvData.headers.filter((h) => {
      const sample = csvData.rows.slice(0, 10);
      return sample.some((r) => typeof r[h] === 'number' || !isNaN(parseFloat(String(r[h]))));
    });
    if (numCols.length === 0) {
      return {
        text: 'No numeric columns found for histogram. Try specifying a column: "histogram of revenue"',
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }
    const result = ml.computeHistogram(csvData, numCols[0]);
    if (!result) {
      return {
        text: `Could not compute histogram for ${numCols[0]}.`,
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }
    return {
      text: `**Distribution of ${numCols[0]}**:`,
      richContent: { type: 'distribution_histogram', data: result },
      suggestions: numCols.slice(1, 4).map((c) => `histogram of ${c}`),
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
  const result = ml.computeHistogram(csvData, column);
  if (!result) {
    return {
      text: `Could not compute histogram for "${column}". Make sure it's a numeric column.`,
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
  return {
    text: `**Distribution of ${column}**:`,
    richContent: { type: 'distribution_histogram', data: result },
    suggestions: ['Show correlations', 'Find outliers', 'Smart summary'],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

async function handleAnomaly(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  context: ConversationContext,
  classification: ClassificationResult
): Promise<BotResponse> {
  const { computeColumnStats, isIqrOutlier, zScore } = await import('@/core/anomaly/numeric-utils');

  const numericCols = csvData.headers.filter((h) => {
    const sample = csvData.rows.slice(0, 20);
    let numCount = 0;
    for (const row of sample) {
      const v = row[h];
      if (typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v)) && v.trim() !== '')) numCount++;
    }
    return numCount / Math.max(sample.length, 1) > 0.8;
  });

  if (numericCols.length === 0) {
    return {
      text: 'No numeric columns found for outlier detection.',
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }

  const outlierRows: Array<{
    rowIndex: number;
    row: Record<string, string | number>;
    outlierColumns: { column: string; value: number; zScore: number; method: string }[];
  }> = [];

  // Compute stats for each numeric column
  const colStats = new Map<string, ReturnType<typeof computeColumnStats>>();
  for (const col of numericCols) {
    const values = csvData.rows.map((r) => {
      const v = r[col];
      return typeof v === 'number' ? v : parseFloat(String(v));
    }).filter((v) => !isNaN(v));
    colStats.set(col, computeColumnStats(values));
  }

  // Check each row for outliers
  for (let i = 0; i < csvData.rows.length; i++) {
    const row = csvData.rows[i];
    const outlierCols: { column: string; value: number; zScore: number; method: string }[] = [];
    for (const col of numericCols) {
      const v = typeof row[col] === 'number' ? row[col] as number : parseFloat(String(row[col]));
      if (isNaN(v)) continue;
      const stats = colStats.get(col)!;
      const z = zScore(v, stats.mean, stats.stdDev);
      const iqrOutlier = isIqrOutlier(v, stats.p25, stats.p75);
      if (Math.abs(z) >= 2 || iqrOutlier) {
        outlierCols.push({
          column: col,
          value: v,
          zScore: Math.round(z * 100) / 100,
          method: Math.abs(z) >= 2 && iqrOutlier ? 'Z-score + IQR' : Math.abs(z) >= 2 ? 'Z-score' : 'IQR',
        });
      }
    }
    if (outlierCols.length > 0) {
      outlierRows.push({ rowIndex: i + 1, row, outlierColumns: outlierCols });
    }
  }

  if (outlierRows.length === 0) {
    return {
      text: `No outliers detected across ${numericCols.length} numeric columns using Z-score and IQR methods.`,
      suggestions: ['Show correlations', 'Profile columns', 'Smart summary'],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }

  return {
    text: `**Outlier Detection**: Found **${outlierRows.length} rows** with anomalous values across ${numericCols.length} numeric columns:`,
    richContent: {
      type: 'anomaly_table',
      data: {
        outlierRows: outlierRows.slice(0, 50), // Limit display
        totalOutliers: outlierRows.length,
        headers: csvData.headers,
        columnsAnalyzed: numericCols,
      },
    },
    suggestions: ['Show correlations', 'Profile columns', 'Cluster the data'],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

async function handleTrend(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  userText: string,
  context: ConversationContext,
  classification: ClassificationResult
): Promise<BotResponse> {
  const ml = await loadML();
  const valueCol = extractColumnFromText(userText, csvData.headers);
  const result = ml.detectTrend(csvData, undefined, valueCol ?? undefined);
  if (!result) {
    return {
      text: 'Could not detect a trend. I need at least one date column and one numeric column.',
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
  return {
    text: `**Trend Analysis**: ${result.nlDescription}`,
    richContent: { type: 'trend_analysis', data: result },
    suggestions: ['Forecast ahead', 'Find outliers', 'Show correlations'],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

async function handleDuplicates(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  context: ConversationContext,
  classification: ClassificationResult
): Promise<BotResponse> {
  const ml = await loadML();
  const result = ml.findDuplicates(csvData);
  if (result.totalDuplicates === 0) {
    return {
      text: `No duplicate or near-duplicate rows found in ${result.totalRows} rows.`,
      suggestions: ['Find outliers', 'Show missing values', 'Profile columns'],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
  return {
    text: `**Duplicate Detection**: Found **${result.totalDuplicates} duplicate/near-duplicate rows** in ${result.groups.length} groups:`,
    richContent: { type: 'duplicate_rows', data: result },
    suggestions: ['Find outliers', 'Show missing values', 'Profile columns'],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

async function handleMissing(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  context: ConversationContext,
  classification: ClassificationResult
): Promise<BotResponse> {
  const ml = await loadML();
  const result = ml.analyzeMissing(csvData);
  if (result.totalMissing === 0) {
    return {
      text: `No missing values found. All ${result.totalCells} cells are populated across ${csvData.headers.length} columns.`,
      suggestions: ['Find outliers', 'Profile columns', 'Show correlations'],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
  return {
    text: `**Missing Value Analysis**: ${result.totalMissing} missing values (${result.missingPercent.toFixed(1)}% of all cells):`,
    richContent: { type: 'missing_heatmap', data: result },
    suggestions: ['Find outliers', 'Profile columns', 'Smart summary'],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

async function handleCluster(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  context: ConversationContext,
  classification: ClassificationResult
): Promise<BotResponse> {
  const ml = await loadML();
  const result = ml.kMeans(csvData);
  if (!result) {
    return {
      text: 'Could not perform clustering. I need at least 2 numeric columns and enough data rows.',
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
  return {
    text: `**Clustering Analysis**: ${result.nlDescription}`,
    richContent: { type: 'clustering_result', data: result },
    suggestions: ['PCA analysis', 'Show correlations', 'Profile columns'],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

async function handleDecisionTree(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  userText: string,
  context: ConversationContext,
  classification: ClassificationResult
): Promise<BotResponse> {
  const ml = await loadML();
  const targetCol = extractColumnFromText(userText, csvData.headers);
  if (!targetCol) {
    return {
      text: `Please specify a target column to predict. Try: "predict ${csvData.headers[csvData.headers.length - 1]}"`,
      suggestions: csvData.headers.slice(0, 4).map((h) => `predict ${h}`),
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
  const result = ml.buildDecisionTree(csvData, targetCol);
  if (!result) {
    return {
      text: `Could not build a decision tree for "${targetCol}". Make sure there are numeric feature columns available.`,
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
  return {
    text: `**Decision Tree** for predicting **${targetCol}** (accuracy: ${(result.accuracy * 100).toFixed(1)}%):`,
    richContent: { type: 'decision_tree_result', data: result },
    suggestions: ['Feature importance', 'Cluster the data', 'Show correlations'],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

async function handleForecast(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  userText: string,
  context: ConversationContext,
  classification: ClassificationResult
): Promise<BotResponse> {
  const ml = await loadML();
  // Extract periods from text: "forecast next 5", "predict 10 ahead"
  const periodsMatch = userText.match(/\b(\d+)\s*(?:periods?|months?|weeks?|days?|steps?|ahead)?\b/i);
  const periods = periodsMatch ? parseInt(periodsMatch[1], 10) : 5;
  const valueCol = extractColumnFromText(userText, csvData.headers);
  const result = ml.forecast(csvData, periods, undefined, valueCol ?? undefined);
  if (!result) {
    return {
      text: 'Could not generate forecast. I need a date column and a numeric column for time-series forecasting.',
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
  return {
    text: `**Forecast**: ${result.nlDescription}`,
    richContent: { type: 'forecast_result', data: result },
    suggestions: ['Show trend', 'Find outliers', 'Show correlations'],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

async function handlePCA(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  context: ConversationContext,
  classification: ClassificationResult
): Promise<BotResponse> {
  const ml = await loadML();
  const result = ml.computePCA(csvData);
  if (!result) {
    return {
      text: 'Could not perform PCA. I need at least 2 numeric columns.',
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
  const totalVar = ((result.varianceExplained[0] + result.varianceExplained[1]) * 100).toFixed(1);
  return {
    text: `**PCA Analysis**: First 2 principal components explain **${totalVar}%** of variance:`,
    richContent: { type: 'pca_result', data: result },
    suggestions: ['Cluster the data', 'Show correlations', 'Profile columns'],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

async function handleReport(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  context: ConversationContext,
  classification: ClassificationResult
): Promise<BotResponse> {
  const ml = await loadML();
  // Run a quick smart summary and profile for the report
  const profiles = ml.profileColumns(csvData);
  const summary = ml.generateSmartSummary(csvData);
  const missing = ml.analyzeMissing(csvData);
  const report = ml.compileInsightReport(csvData, { profiles, summary, missing });
  return {
    text: `**Analysis Report** compiled with ${report.sections.length} sections. Download the full report below:`,
    richContent: { type: 'insight_report', data: report },
    suggestions: ['Show correlations', 'Find outliers', 'Cluster the data'],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}
