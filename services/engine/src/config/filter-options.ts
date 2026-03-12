/**
 * Filter option types.
 *
 * Runtime config is now stored in src/config/filter-config.json and served via:
 *   - /api/filters        (public, read-only — used by chat UI)
 *   - /api/admin/filters   (admin CRUD)
 *
 * This file only exports the shared TypeScript interface.
 */

export interface FilterOptionConfig {
  label: string;
  type: 'select' | 'text' | 'boolean';
  options?: { value: string; label: string }[];
  placeholder?: string;
}
