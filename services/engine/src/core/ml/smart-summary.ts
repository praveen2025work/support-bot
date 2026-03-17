import { profileColumns, type ColumnProfile } from '@/core/ml/profiler';
import { type CsvData } from '@/core/api-connector/csv-analyzer';

/** Severity level for a highlight. */
export type HighlightSeverity = 'info' | 'notable' | 'critical';

/** A single highlighted finding attached to a column. */
export interface Highlight {
  column: string;
  insight: string;
  severity: HighlightSeverity;
}

/** Result returned by {@link generateSmartSummary}. */
export interface SmartSummaryResult {
  insights: string[];
  highlights: Highlight[];
}

/**
 * Generate natural-language insights from dataset profiles.
 *
 * Internally calls {@link profileColumns} and then translates the
 * statistical output into human-readable sentences covering numeric
 * distributions, categorical breakdowns, and data-quality warnings.
 */
export function generateSmartSummary(data: CsvData): SmartSummaryResult {
  const profiles = profileColumns(data);
  const insights: string[] = [];
  const highlights: Highlight[] = [];

  for (const p of profiles) {
    if (p.numericStats) {
      insights.push(buildNumericInsight(p));
      addNumericHighlights(p, highlights);
    } else if (p.type === 'string' || p.type === 'id') {
      insights.push(buildCategoricalInsight(p, data.rows.length));
      addCategoricalHighlights(p, data.rows.length, highlights);
    }
  }

  // Data quality insights
  const highMissing = profiles.filter((p) => p.nullPercent > 10);
  if (highMissing.length > 0) {
    const names = highMissing.map((p) => p.column).join(', ');
    insights.push(
      `${highMissing.length} column${highMissing.length > 1 ? 's' : ''} ha${highMissing.length > 1 ? 've' : 's'} >10% missing values: ${names}`
    );
    for (const p of highMissing) {
      highlights.push({
        column: p.column,
        insight: `${p.nullPercent}% missing values (${p.nullCount}/${data.rows.length})`,
        severity: p.nullPercent > 50 ? 'critical' : 'notable',
      });
    }
  }

  return { insights, highlights };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return String(Math.round(n * 100) / 100);
}

function buildNumericInsight(p: ColumnProfile): string {
  const s = p.numericStats!;
  const parts: string[] = [`${p.column} has mean ${formatNumber(s.mean)}`];

  if (s.skewness > 0.5) {
    parts.push(`is right-skewed (skewness=${s.skewness})`);
  } else if (s.skewness < -0.5) {
    parts.push(`is left-skewed (skewness=${s.skewness})`);
  }

  if (s.outlierCount > 0) {
    parts.push(`${s.outlierCount} outlier${s.outlierCount > 1 ? 's' : ''} detected`);
  }

  return parts.join(', ');
}

function addNumericHighlights(p: ColumnProfile, highlights: Highlight[]): void {
  const s = p.numericStats!;

  if (s.outlierCount > 0) {
    highlights.push({
      column: p.column,
      insight: `${s.outlierCount} outlier${s.outlierCount > 1 ? 's' : ''} detected (IQR method)`,
      severity: s.outlierCount > 5 ? 'notable' : 'info',
    });
  }

  if (Math.abs(s.skewness) > 1) {
    highlights.push({
      column: p.column,
      insight: `Highly skewed distribution (skewness=${s.skewness})`,
      severity: 'notable',
    });
  }
}

function buildCategoricalInsight(p: ColumnProfile, totalRows: number): string {
  const parts: string[] = [
    `${p.column} has ${p.cardinality} unique value${p.cardinality !== 1 ? 's' : ''}`,
  ];

  if (p.topValues.length > 0) {
    const top = p.topValues[0];
    const pct = Math.round((top.count / totalRows) * 100);
    parts.push(`most common is '${top.value}' (${pct}%)`);
  }

  return parts.join(', ');
}

function addCategoricalHighlights(
  p: ColumnProfile,
  totalRows: number,
  highlights: Highlight[]
): void {
  if (p.topValues.length > 0) {
    const topPct = Math.round((p.topValues[0].count / totalRows) * 100);
    if (topPct > 80) {
      highlights.push({
        column: p.column,
        insight: `Dominated by '${p.topValues[0].value}' at ${topPct}% — low variance`,
        severity: 'notable',
      });
    }
  }

  if (p.cardinality === totalRows && totalRows > 10) {
    highlights.push({
      column: p.column,
      insight: 'Every value is unique — possible identifier column',
      severity: 'info',
    });
  }
}
