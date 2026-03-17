import { type CsvData } from '@/core/api-connector/csv-analyzer';

/** Per-column missing value statistics. */
export interface MissingColumnInfo {
  column: string;
  nullCount: number;
  nullPercent: number;
}

/** A single row in the heatmap grid showing which columns are missing. */
export interface HeatmapRow {
  row: number;
  /** Maps column name to `true` if the value is missing, `false` otherwise. */
  columns: Record<string, boolean>;
}

/** Result returned by {@link analyzeMissing}. */
export interface MissingResult {
  columns: MissingColumnInfo[];
  totalCells: number;
  totalMissing: number;
  missingPercent: number;
  /** Presence/absence grid for the first 50 rows (for visualisation). */
  heatmapGrid: HeatmapRow[];
}

/**
 * Analyse missing (null / empty) values across the dataset.
 *
 * Produces per-column counts, overall statistics, and a boolean
 * heatmap grid sampled from the first 50 rows to support a
 * front-end missing-value visualisation.
 */
export function analyzeMissing(data: CsvData): MissingResult {
  const { headers, rows } = data;

  const totalCells = headers.length * rows.length;
  const columnCounts = new Map<string, number>();

  for (const h of headers) {
    columnCounts.set(h, 0);
  }

  // Count missing values per column
  for (const row of rows) {
    for (const h of headers) {
      const raw = row[h];
      if (isMissing(raw)) {
        columnCounts.set(h, (columnCounts.get(h) ?? 0) + 1);
      }
    }
  }

  const columns: MissingColumnInfo[] = headers.map((h) => {
    const nullCount = columnCounts.get(h) ?? 0;
    return {
      column: h,
      nullCount,
      nullPercent: rows.length > 0
        ? Math.round((nullCount / rows.length) * 10000) / 100
        : 0,
    };
  });

  const totalMissing = columns.reduce((sum, c) => sum + c.nullCount, 0);
  const missingPercent = totalCells > 0
    ? Math.round((totalMissing / totalCells) * 10000) / 100
    : 0;

  // Heatmap grid — sample first 50 rows
  const sampleSize = Math.min(50, rows.length);
  const heatmapGrid: HeatmapRow[] = [];

  for (let i = 0; i < sampleSize; i++) {
    const row = rows[i];
    const cols: Record<string, boolean> = {};
    for (const h of headers) {
      cols[h] = isMissing(row[h]);
    }
    heatmapGrid.push({ row: i, columns: cols });
  }

  return {
    columns,
    totalCells,
    totalMissing,
    missingPercent,
    heatmapGrid,
  };
}

/** Check whether a cell value should be considered missing. */
function isMissing(value: string | number | undefined | null): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
}
