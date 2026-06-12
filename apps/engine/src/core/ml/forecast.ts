import { detectColumnTypes, type CsvData } from '@/core/api-connector/csv-analyzer';

/** Result of exponential smoothing forecast. */
export interface ForecastResult {
  dateColumn: string;
  valueColumn: string;
  historical: { date: string; value: number }[];
  predicted: { date: string; value: number }[];
  alpha: number;
  mse: number;
  nlDescription: string;
}

/**
 * Run simple exponential smoothing with a given alpha and return MSE.
 */
function exponentialSmooth(
  values: number[],
  alpha: number
): { fitted: number[]; mse: number } {
  const n = values.length;
  if (n === 0) return { fitted: [], mse: Infinity };

  const fitted: number[] = [values[0]];
  for (let i = 1; i < n; i++) {
    fitted.push(alpha * values[i - 1] + (1 - alpha) * fitted[i - 1]);
  }

  let sse = 0;
  for (let i = 1; i < n; i++) {
    const err = values[i] - fitted[i];
    sse += err * err;
  }
  const mse = sse / (n - 1);

  return { fitted, mse };
}

/**
 * Find optimal alpha by grid search over [0.1, 0.9].
 */
function findOptimalAlpha(values: number[]): { alpha: number; mse: number } {
  let bestAlpha = 0.3;
  let bestMse = Infinity;

  for (let a = 1; a <= 9; a++) {
    const alpha = a / 10;
    const { mse } = exponentialSmooth(values, alpha);
    if (mse < bestMse) {
      bestMse = mse;
      bestAlpha = alpha;
    }
  }

  return { alpha: bestAlpha, mse: Math.round(bestMse * 100) / 100 };
}

/**
 * Attempt to parse a string as a Date and return an ISO date string.
 */
function parseDate(value: string | number): Date | null {
  if (typeof value === 'number') {
    // Excel serial date: days since 1899-12-30
    if (value > 1 && value < 200000) {
      const epoch = new Date(1899, 11, 30);
      epoch.setDate(epoch.getDate() + value);
      return epoch;
    }
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;

  return null;
}

/**
 * Extrapolate future date strings by extending the average interval.
 */
function extrapolateDates(dates: Date[], count: number): string[] {
  if (dates.length < 2) {
    const result: string[] = [];
    const last = dates.length > 0 ? dates[dates.length - 1] : new Date();
    for (let i = 1; i <= count; i++) {
      const d = new Date(last);
      d.setMonth(d.getMonth() + i);
      result.push(d.toISOString().slice(0, 10));
    }
    return result;
  }

  // Compute average interval in milliseconds
  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    intervals.push(dates[i].getTime() - dates[i - 1].getTime());
  }
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const lastDate = dates[dates.length - 1];

  const result: string[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(lastDate.getTime() + avgInterval * i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

/**
 * Simple Exponential Smoothing forecast.
 *
 * Automatically selects the optimal smoothing parameter (alpha) by
 * minimizing MSE across a grid search. Date and value columns are
 * auto-detected if not specified.
 *
 * @param data        - Parsed CSV data.
 * @param periods     - Number of future periods to forecast (default 5).
 * @param dateColumn  - Column containing date values (auto-detected if omitted).
 * @param valueColumn - Column containing numeric values to forecast (auto-detected if omitted).
 * @returns Forecast result or null if data is insufficient.
 */
export function forecast(
  data: CsvData,
  periods = 5,
  dateColumn?: string,
  valueColumn?: string
): ForecastResult | null {
  if (data.rows.length < 3) return null;

  // Auto-detect columns if not specified
  const colTypes = detectColumnTypes(data.headers, data.rows);

  let datCol = dateColumn;
  if (!datCol) {
    const dateColMeta = colTypes.find((c) => c.detectedType === 'date');
    if (!dateColMeta) return null;
    datCol = dateColMeta.column;
  }

  let valCol = valueColumn;
  if (!valCol) {
    const numColMeta = colTypes.find(
      (c) => (c.detectedType === 'integer' || c.detectedType === 'decimal') && c.column !== datCol
    );
    if (!numColMeta) return null;
    valCol = numColMeta.column;
  }

  if (!data.headers.includes(datCol) || !data.headers.includes(valCol)) return null;

  // Build date-value pairs and sort by date
  const pairs: { date: Date; dateStr: string; value: number }[] = [];
  for (const row of data.rows) {
    const d = parseDate(row[datCol]);
    if (!d) continue;
    const rawVal = row[valCol];
    const v = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
    if (isNaN(v)) continue;
    pairs.push({ date: d, dateStr: d.toISOString().slice(0, 10), value: v });
  }

  if (pairs.length < 3) return null;

  pairs.sort((a, b) => a.date.getTime() - b.date.getTime());

  const values = pairs.map((p) => p.value);
  const dates = pairs.map((p) => p.date);

  // Find optimal alpha
  const { alpha, mse } = findOptimalAlpha(values);

  // Generate forecast using optimal alpha
  const { fitted } = exponentialSmooth(values, alpha);
  let lastSmoothed = fitted[fitted.length - 1];

  const predicted: { date: string; value: number }[] = [];
  const futureDates = extrapolateDates(dates, periods);

  for (let i = 0; i < periods; i++) {
    // For SES, all future forecasts are the same (last smoothed value)
    // but we apply slight continuation for more useful output
    const forecastValue = Math.round(lastSmoothed * 100) / 100;
    predicted.push({ date: futureDates[i], value: forecastValue });
    // SES flat forecast: each future period uses the same level
    lastSmoothed = alpha * lastSmoothed + (1 - alpha) * lastSmoothed;
  }

  const historical = pairs.map((p) => ({
    date: p.dateStr,
    value: p.value,
  }));

  const nlDescription =
    `Forecasting ${periods} periods ahead using exponential smoothing (\u03B1=${alpha}, MSE=${mse})`;

  return {
    dateColumn: datCol,
    valueColumn: valCol,
    historical,
    predicted,
    alpha,
    mse,
    nlDescription,
  };
}
