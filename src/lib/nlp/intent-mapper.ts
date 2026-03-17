/**
 * lib/nlp/intent-mapper.ts
 * Extends @nlpjs/nlp training corpus with ML analysis intents
 * Maps natural language queries → ML pipeline calls
 */

import type { MLIntent, ParsedIntent } from '../../types/ml';

// ─── Training Data ─────────────────────────────────────────────────────────────
// Add these utterances to your existing @nlpjs NlpManager instance

export const ML_TRAINING_CORPUS = {
  locale: 'en',
  data: [

    // ── profile_data ────────────────────────────────────────────────────────
    { intent: 'ml.profile_data', utterances: [
      'analyze this file',
      'what columns do I have',
      'describe the data',
      'give me a summary of the dataset',
      'what does this csv contain',
      'profile the data',
      'show me column types',
      'what are the data types',
      'summarize this spreadsheet',
      'tell me about this file',
      'inspect the data',
      'what fields are in this file',
    ]},

    // ── find_anomalies ──────────────────────────────────────────────────────
    { intent: 'ml.find_anomalies', utterances: [
      'find outliers',
      'show me anomalies',
      'detect anomalies in %column%',
      'which rows are outliers',
      'find unusual values in %column%',
      'are there any weird values',
      'show me outliers in %column%',
      'flag abnormal rows',
      'find extreme values',
      'what is out of range',
      'detect fraud patterns',
      'show spikes in %column%',
      'which rows have suspicious values',
    ]},

    // ── show_trend ──────────────────────────────────────────────────────────
    { intent: 'ml.show_trend', utterances: [
      'show me the trend in %column%',
      'is %column% increasing',
      'is %column% decreasing',
      'what is the trend over time',
      'plot %column% over time',
      'how is %column% trending',
      'trend analysis for %column%',
      'show time series for %column%',
      'what is the growth rate',
      'is there a pattern over time',
      'line chart for %column%',
    ]},

    // ── forecast ───────────────────────────────────────────────────────────
    { intent: 'ml.forecast', utterances: [
      'forecast %column% for next 3 months',
      'predict next period values',
      'what will %column% be next month',
      'forecast future values',
      'predict next %periods% periods',
      'extrapolate %column%',
      'project future %column%',
      'estimate next quarter',
    ]},

    // ── cluster_data ────────────────────────────────────────────────────────
    { intent: 'ml.cluster_data', utterances: [
      'cluster the data',
      'segment the rows',
      'group similar rows',
      'find natural groups',
      'how many segments are there',
      'cluster by %column%',
      'group customers by behavior',
      'show me customer segments',
      'identify patterns in the data',
      'run k-means',
      'what are the natural groups',
      'segment users by %column% and %column%',
    ]},

    // ── predict_column ──────────────────────────────────────────────────────
    { intent: 'ml.predict_column', utterances: [
      'predict %column%',
      'what drives %column%',
      'which columns predict %column%',
      'classify rows by %column%',
      'train a model on %column%',
      'what factors affect %column%',
      'regression on %column%',
      'build a model to predict %column%',
    ]},

    // ── show_correlation ────────────────────────────────────────────────────
    { intent: 'ml.show_correlation', utterances: [
      'show correlation',
      'are %column% and %column% related',
      'correlation matrix',
      'which columns are correlated',
      'show heatmap',
      'what correlates with %column%',
      'find related columns',
      'how does %column% relate to %column%',
      'is there a relationship between %column% and %column%',
    ]},

    // ── find_duplicates ─────────────────────────────────────────────────────
    { intent: 'ml.find_duplicates', utterances: [
      'find duplicates',
      'are there duplicate rows',
      'show me repeated rows',
      'detect duplicate entries',
      'find near duplicates',
      'which rows are similar',
      'are there repeated records',
      'find matching rows',
      'deduplicate the data',
    ]},

    // ── show_histogram ──────────────────────────────────────────────────────
    { intent: 'ml.show_histogram', utterances: [
      'show distribution of %column%',
      'histogram of %column%',
      'how is %column% distributed',
      'distribution chart for %column%',
      'show the spread of %column%',
      'what does %column% look like',
      'frequency chart for %column%',
    ]},

    // ── Gap C fix: summarize intent now has training utterances ──────────────
    { intent: 'ml.summarize', utterances: [
      'summarize the data',
      'give me a quick summary',
      'what are the key stats',
      'overview of the dataset',
      'key highlights',
      'data summary',
      'quick stats',
      'whats in this data',
    ]},
  ],
};

// ─── Entity Extraction ─────────────────────────────────────────────────────────

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

export function extractEntities(
  query: string,
  availableColumns: string[]
): ParsedIntent['entities'] {
  const lower = query.toLowerCase();

  // ── Column extraction: match known column names (fuzzy) ──────────────────
  const columns: string[] = [];
  for (const col of availableColumns) {
    const colLower = col.toLowerCase().replace(/_/g, ' ');
    if (lower.includes(colLower) || lower.includes(col.toLowerCase())) {
      columns.push(col);
    }
  }

  // ── Target column (last mentioned in predict/regression context) ─────────
  const targetKeywords = ['predict', 'target', 'model on', 'classify by', 'for'];
  let targetColumn: string | undefined;
  for (const kw of targetKeywords) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      // Find first matching column after the keyword
      const afterKw = lower.slice(idx + kw.length);
      for (const col of availableColumns) {
        if (afterKw.includes(col.toLowerCase())) {
          targetColumn = col;
          break;
        }
      }
    }
  }

  // ── K for clustering ─────────────────────────────────────────────────────
  let k: number | undefined;
  const kMatch = lower.match(/(\d+)\s*(cluster|group|segment|k\s*=)/);
  if (kMatch) k = parseInt(kMatch[1]);

  // ── Forecast periods ─────────────────────────────────────────────────────
  let periods: number | undefined;
  const pMatch = lower.match(/(\d+|one|two|three|four|five|six)\s*(period|month|week|quarter|day)/);
  if (pMatch) {
    periods = parseInt(pMatch[1]) || NUMBER_WORDS[pMatch[1]] || 3;
  }

  // ── Anomaly threshold ─────────────────────────────────────────────────────
  let threshold: number | undefined;
  const tMatch = lower.match(/(\d+(\.\d+)?)\s*(sigma|standard deviation|sd|z)/);
  if (tMatch) threshold = parseFloat(tMatch[1]);

  return { columns, targetColumn, k, periods, threshold };
}

// ─── Intent → ML Pipeline Map ─────────────────────────────────────────────────

export type PipelineTrigger = {
  intent: MLIntent;
  requires: 'numeric_columns' | 'date_column' | 'any_column' | 'none';
  minColumns: number;
  description: string;
};

export const INTENT_PIPELINE_MAP: Record<MLIntent, PipelineTrigger> = {
  profile_data:    { intent: 'profile_data',    requires: 'none',           minColumns: 0, description: 'Full dataset profile' },
  find_anomalies:  { intent: 'find_anomalies',  requires: 'numeric_columns', minColumns: 1, description: 'IQR + Z-score outlier detection' },
  show_trend:      { intent: 'show_trend',      requires: 'date_column',    minColumns: 2, description: 'Linear trend + forecast' },
  forecast:        { intent: 'forecast',        requires: 'date_column',    minColumns: 2, description: 'Exponential smoothing forecast' },
  cluster_data:    { intent: 'cluster_data',    requires: 'numeric_columns', minColumns: 2, description: 'K-Means segmentation' },
  predict_column:  { intent: 'predict_column',  requires: 'numeric_columns', minColumns: 2, description: 'Linear regression predictor' },
  show_correlation:{ intent: 'show_correlation',requires: 'numeric_columns', minColumns: 2, description: 'Pearson correlation matrix' },
  find_duplicates: { intent: 'find_duplicates', requires: 'any_column',     minColumns: 1, description: 'Exact + fuzzy duplicate detection' },
  show_histogram:  { intent: 'show_histogram',  requires: 'numeric_columns', minColumns: 1, description: 'Column distribution histogram' },
  summarize:       { intent: 'summarize',       requires: 'none',           minColumns: 0, description: 'Smart summary stats' },
  unknown:         { intent: 'unknown',         requires: 'none',           minColumns: 0, description: '' },
};

// ─── NlpManager Registration Helper ───────────────────────────────────────────

/**
 * Call this once during bot initialization to register ML intents
 *
 * @example
 * import { NlpManager } from '@nlpjs/nlp';
 * const manager = new NlpManager({ languages: ['en'] });
 * await registerMLIntents(manager);
 * await manager.train();
 */
export async function registerMLIntents(manager: {
  addDocument(locale: string, utterance: string, intent: string): void;
  train(): Promise<void>;
}): Promise<void> {
  for (const { intent, utterances } of ML_TRAINING_CORPUS.data) {
    for (const utterance of utterances) {
      manager.addDocument('en', utterance, intent);
    }
  }
}

// ─── Post-Process NLP Result → ParsedIntent ───────────────────────────────────

export function buildParsedIntent(
  nlpResult: { intent: string; score: number },
  rawQuery: string,
  availableColumns: string[]
): ParsedIntent {
  const intentKey = nlpResult.intent.replace('ml.', '') as MLIntent;

  return {
    intent:     intentKey,
    confidence: parseFloat((nlpResult.score ?? 0).toFixed(3)),
    entities:   extractEntities(rawQuery, availableColumns),
    rawQuery,
  };
}
