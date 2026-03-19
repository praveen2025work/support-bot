/**
 * Filter option types.
 *
 * Runtime config is now stored in src/config/filter-config.json and served via:
 *   - /api/filters        (public, read-only — used by chat UI)
 *   - /api/admin/filters   (admin CRUD)
 *
 * This file exports the shared TypeScript interfaces.
 *
 * ── Standard API response contract ──────────────────────────────────
 * Every filter source URL must return JSON in one of these shapes:
 *
 *   Shape A – array of objects (default fields: "value" & "label"):
 *     [{ "value": "US", "label": "United States" }, ...]
 *
 *   Shape B – array of plain strings (auto-mapped to value & label):
 *     ["US", "EU", "APAC"]
 *
 *   Shape C – nested response (use valuePath to reach the array):
 *     { "data": { "items": [{ "code": "US", "name": "United States" }] } }
 *     → set valuePath="data.items", valueField="code", labelField="name"
 */

export interface FilterSource {
  /** GET endpoint URL that returns filter options */
  url: string;
  /** Dot-notation path to the options array in the response (e.g. "data.items").
   *  If omitted, the top-level response is expected to be the array. */
  valuePath?: string;
  /** Field name for the option value (default: "value") */
  valueField?: string;
  /** Field name for the option label (default: "label") */
  labelField?: string;
  /** ISO timestamp of last successful refresh */
  lastRefreshed?: string | null;
}

export type FilterType =
  | "select"
  | "text"
  | "boolean"
  | "multi_select"
  | "date"
  | "date_range"
  | "number_range"
  | "search";

export interface FilterOptionConfig {
  label: string;
  type: FilterType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Dynamic API source for fetching dropdown options */
  source?: FilterSource;
  /** For date/date_range: format string (default YYYY-MM-DD) */
  dateFormat?: string;
  /** For date_range: quick-pick presets alongside date pickers */
  presets?: { value: string; label: string }[];
  /** For number_range: bounds and step */
  numberConfig?: { min?: number; max?: number; step?: number };
  /** For search: debounce delay in ms (default 300) */
  debounceMs?: number;
}
