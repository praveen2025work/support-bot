/**
 * Shared filter configuration fetcher and parser.
 *
 * Eliminates duplicated filter config parsing logic that was previously
 * copy-pasted across QueryFilterForm, QueryCard, AddFavoriteModal, and
 * GridBoardShell (4 identical copies with slight variations).
 *
 * Usage:
 *   const configs = await fetchFilterConfigs();
 *   const config = getFilterConfig(configs, 'region');
 */

import type { FilterInputConfig } from "@/components/shared/FilterInput";

/** In-memory cache shared across all callers within the same page session */
let cachedConfigs: Record<string, FilterInputConfig> | null = null;
let fetchPromise: Promise<Record<string, FilterInputConfig>> | null = null;

/**
 * Builds a fallback FilterInputConfig for filters not found in the server config.
 * Converts snake_case keys to Title Case labels.
 *
 * @param filterKey - The raw filter key (e.g. 'date_range')
 * @returns A text-type FilterInputConfig with auto-generated label
 *
 * @example
 *   getFallbackConfig('business_date')
 *   // => { label: 'Business Date', type: 'text', placeholder: 'Enter business_date...' }
 */
export function getFallbackConfig(filterKey: string): FilterInputConfig {
  return {
    label: filterKey
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()),
    type: "text",
    placeholder: `Enter ${filterKey}...`,
  };
}

/**
 * Parses the raw filter entry from the /api/filters response into a
 * typed FilterInputConfig object.
 *
 * @param key - The filter key from the API response
 * @param entry - The raw filter entry object from the API
 * @returns A fully-typed FilterInputConfig
 */
function parseFilterEntry(
  key: string,
  entry: Record<string, unknown>,
): FilterInputConfig {
  return {
    label: String(entry.label || key),
    type: (entry.type as FilterInputConfig["type"]) || "text",
    options:
      ["select", "multi_select"].includes(String(entry.type)) &&
      Array.isArray(entry.options)
        ? (entry.options as { value: string; label: string }[])
        : undefined,
    placeholder: entry.placeholder ? String(entry.placeholder) : undefined,
    hasDynamicSource: !!entry.source,
    dateFormat: entry.dateFormat ? String(entry.dateFormat) : undefined,
    presets: Array.isArray(entry.presets)
      ? (entry.presets as { value: string; label: string }[])
      : undefined,
    numberConfig: entry.numberConfig
      ? (entry.numberConfig as { min?: number; max?: number; step?: number })
      : undefined,
    debounceMs:
      typeof entry.debounceMs === "number" ? entry.debounceMs : undefined,
    sourceUrl: (entry.source as Record<string, unknown>)?.url
      ? String((entry.source as Record<string, unknown>).url)
      : undefined,
  };
}

/**
 * Fetches and parses filter configurations from /api/filters.
 * Results are cached in memory — subsequent calls return the cached value.
 * Concurrent calls are deduplicated (only one fetch in flight at a time).
 *
 * @returns A record of filter key -> FilterInputConfig, with both original
 *          and lowercase keys for case-insensitive lookup.
 *
 * @example
 *   const configs = await fetchFilterConfigs();
 *   const regionConfig = configs['region'] || configs['Region'];
 */
export async function fetchFilterConfigs(): Promise<
  Record<string, FilterInputConfig>
> {
  if (cachedConfigs) return cachedConfigs;

  // Deduplicate concurrent calls
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const response = await fetch("/api/filters");
      if (!response.ok) return {};

      const json = await response.json();
      const configs: Record<string, FilterInputConfig> = {};

      for (const [key, entry] of Object.entries(json.filters || {})) {
        const config = parseFilterEntry(key, entry as Record<string, unknown>);
        // Store under original key AND lowercase for case-insensitive lookup
        configs[key] = config;
        configs[key.toLowerCase()] = config;
      }

      cachedConfigs = configs;
      return configs;
    } catch {
      // Return empty on network failure — callers use fallback configs
      return {};
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Looks up a filter config by key with case-insensitive fallback.
 * Returns a generated fallback config if the key is not found.
 *
 * @param configs - The parsed filter configs from fetchFilterConfigs()
 * @param filterKey - The key to look up
 * @returns The matching FilterInputConfig or a generated fallback
 *
 * @example
 *   const config = getFilterConfig(configs, 'Region');
 *   // Returns configs['Region'] || configs['region'] || fallback
 */
export function getFilterConfig(
  configs: Record<string, FilterInputConfig>,
  filterKey: string,
): FilterInputConfig {
  return (
    configs[filterKey] ||
    configs[filterKey.toLowerCase()] ||
    getFallbackConfig(filterKey)
  );
}

/**
 * Invalidates the cached filter configs, forcing the next call to
 * fetchFilterConfigs() to re-fetch from the server.
 * Useful after an admin updates filter options.
 */
export function invalidateFilterConfigCache(): void {
  cachedConfigs = null;
}
