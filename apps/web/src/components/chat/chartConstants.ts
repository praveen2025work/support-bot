/**
 * Maximum number of rows the chart ever plots. Kept in its own tiny module so
 * callers that lazy-load DataChart (to defer the heavy Recharts bundle) can
 * trim their input without statically pulling DataChart into their chunk.
 */
export const CHART_MAX_ROWS = 30;
