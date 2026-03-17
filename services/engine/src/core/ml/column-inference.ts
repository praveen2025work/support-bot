import { detectColumnTypes, type CsvData } from '@/core/api-connector/csv-analyzer';

/** Extended column metadata with additional type detection. */
export interface EnhancedColumnMeta {
  column: string;
  detectedType:
    | 'date'
    | 'integer'
    | 'decimal'
    | 'id'
    | 'string'
    | 'currency'
    | 'category'
    | 'percentage'
    | 'email'
    | 'phone';
  format?: string;
  nullPercent: number;
  cardinality: number;
}

/** A suggested analysis based on column metadata. */
export interface AnalysisSuggestion {
  analysis: string;
  reason: string;
  columns: string[];
}

const CURRENCY_PATTERN = /^\$[\d,]+(\.\d{1,2})?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+]?[\d\s().-]{7,15}$/;
const PERCENTAGE_SUFFIX = /^\s*[\d.]+\s*%\s*$/;

/**
 * Detect enhanced column types including currency, category, percentage, email, and phone.
 *
 * Extends the base `detectColumnTypes` with additional pattern-based detection
 * for financial, contact, and categorical data.
 *
 * @param data - Parsed CSV data.
 * @returns Array of enhanced column metadata.
 */
export function enhancedColumnTypes(data: CsvData): EnhancedColumnMeta[] {
  const baseTypes = detectColumnTypes(data.headers, data.rows);
  const baseMap = new Map(baseTypes.map((t) => [t.column, t]));
  const result: EnhancedColumnMeta[] = [];

  for (const header of data.headers) {
    const base = baseMap.get(header);
    const values = data.rows.map((row) => row[header]);
    const nonNull = values.filter((v) => v !== undefined && v !== null && v !== '');
    const nullCount = values.length - nonNull.length;
    const nullPercent = values.length > 0
      ? Math.round((nullCount / values.length) * 10000) / 10000
      : 0;
    const cardinality = new Set(nonNull.map(String)).size;

    const strValues = nonNull.map(String);
    const sampleSize = Math.min(strValues.length, 50);
    const sample = strValues.slice(0, sampleSize);

    // Check currency pattern: $X,XXX.XX
    const currencyCount = sample.filter((v) => CURRENCY_PATTERN.test(v.trim())).length;
    if (sampleSize > 0 && currencyCount / sampleSize > 0.8) {
      result.push({
        column: header,
        detectedType: 'currency',
        format: '$X,XXX.XX',
        nullPercent,
        cardinality,
      });
      continue;
    }

    // Check email
    const emailCount = sample.filter((v) => EMAIL_PATTERN.test(v.trim())).length;
    if (sampleSize > 0 && emailCount / sampleSize > 0.8) {
      result.push({
        column: header,
        detectedType: 'email',
        nullPercent,
        cardinality,
      });
      continue;
    }

    // Check phone
    const phoneCount = sample.filter((v) => PHONE_PATTERN.test(v.trim())).length;
    if (sampleSize > 0 && phoneCount / sampleSize > 0.8 && base?.detectedType === 'string') {
      result.push({
        column: header,
        detectedType: 'phone',
        nullPercent,
        cardinality,
      });
      continue;
    }

    // Check percentage: ends in % or 0-100 with rate/pct in name
    const pctSuffixCount = sample.filter((v) => PERCENTAGE_SUFFIX.test(v)).length;
    const lowerHeader = header.toLowerCase();
    const nameHintsPct = /rate|pct|percent|ratio/i.test(lowerHeader);
    if (sampleSize > 0 && pctSuffixCount / sampleSize > 0.8) {
      result.push({
        column: header,
        detectedType: 'percentage',
        format: 'X%',
        nullPercent,
        cardinality,
      });
      continue;
    }
    if (
      nameHintsPct &&
      (base?.detectedType === 'integer' || base?.detectedType === 'decimal')
    ) {
      // Check if values are in 0-100 range
      const numValues = nonNull.map((v) =>
        typeof v === 'number' ? v : parseFloat(String(v))
      ).filter((v) => !isNaN(v));
      const inRange = numValues.every((v) => v >= 0 && v <= 100);
      if (inRange && numValues.length > 0) {
        result.push({
          column: header,
          detectedType: 'percentage',
          format: '0-100',
          nullPercent,
          cardinality,
        });
        continue;
      }
    }

    // Check category: string type with low cardinality relative to row count
    if (
      (base?.detectedType === 'string') &&
      cardinality > 0 &&
      cardinality < 20 &&
      nonNull.length > 0 &&
      cardinality / nonNull.length < 0.5
    ) {
      result.push({
        column: header,
        detectedType: 'category',
        nullPercent,
        cardinality,
      });
      continue;
    }

    // Fall back to base type
    result.push({
      column: header,
      detectedType: base?.detectedType ?? 'string',
      format: base?.format,
      nullPercent,
      cardinality,
    });
  }

  return result;
}

/**
 * Suggest analyses based on the detected column types.
 *
 * Examines the mix of date, numeric, and categorical columns to recommend
 * relevant statistical and ML analyses.
 *
 * @param meta - Enhanced column metadata from `enhancedColumnTypes`.
 * @returns Array of analysis suggestions.
 */
export function suggestAnalyses(meta: EnhancedColumnMeta[]): AnalysisSuggestion[] {
  const suggestions: AnalysisSuggestion[] = [];

  const dateCols = meta.filter((m) => m.detectedType === 'date');
  const numericCols = meta.filter((m) =>
    ['integer', 'decimal', 'currency', 'percentage'].includes(m.detectedType)
  );
  const categoryCols = meta.filter((m) => m.detectedType === 'category');
  const highNullCols = meta.filter((m) => m.nullPercent > 0.05);

  // Date + numeric: suggest trend/forecast
  if (dateCols.length > 0 && numericCols.length > 0) {
    suggestions.push({
      analysis: 'trend',
      reason: 'Date and numeric columns detected — can analyze trends over time.',
      columns: [dateCols[0].column, ...numericCols.map((c) => c.column)],
    });
    suggestions.push({
      analysis: 'forecast',
      reason: 'Time series data available for forecasting future values.',
      columns: [dateCols[0].column, numericCols[0].column],
    });
  }

  // Multiple numeric columns: correlation and PCA
  if (numericCols.length >= 2) {
    suggestions.push({
      analysis: 'correlation',
      reason: 'Multiple numeric columns can reveal relationships between variables.',
      columns: numericCols.map((c) => c.column),
    });
    suggestions.push({
      analysis: 'pca',
      reason: 'Dimensionality reduction can reveal hidden structure in multi-dimensional data.',
      columns: numericCols.map((c) => c.column),
    });
  }

  // Low cardinality columns: group-by and clustering
  if (categoryCols.length > 0) {
    suggestions.push({
      analysis: 'group_by',
      reason: 'Categorical columns with few distinct values are ideal for grouping.',
      columns: categoryCols.map((c) => c.column),
    });
    if (numericCols.length >= 2) {
      suggestions.push({
        analysis: 'clustering',
        reason: 'Categorical data with numeric features can be segmented into clusters.',
        columns: [...categoryCols.map((c) => c.column), ...numericCols.map((c) => c.column)],
      });
    }
  }

  // Missing data
  if (highNullCols.length > 0) {
    suggestions.push({
      analysis: 'missing_analysis',
      reason: `Columns with significant missing data detected (${highNullCols.length} columns).`,
      columns: highNullCols.map((c) => c.column),
    });
  }

  return suggestions;
}
