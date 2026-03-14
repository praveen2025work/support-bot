import type { QueryFilters } from '../../api-connector/types';
import type { ExtractedEntity } from '../../types';
import {
  FILTER_ENTITIES,
  GROUP_BY_PATTERN,
  SORT_PATTERN,
  SUMMARY_PATTERN,
} from '../constants';

/**
 * Mapping from NLP entity names to API filter keys.
 * The NLP extracts 'time_period' but the API/filter-config uses 'date_range'.
 */
const ENTITY_TO_FILTER_KEY: Record<string, string> = {
  time_period: 'date_range',
  region: 'region',
  team: 'team',
  environment: 'environment',
  severity: 'severity',
};

/**
 * Canonical value normalization — ensures consistent casing and naming.
 */
const VALUE_NORMALIZATION: Record<string, Record<string, string>> = {
  region: {
    us: 'US', usa: 'US', 'united states': 'US', america: 'US',
    eu: 'EU', europe: 'EU', european: 'EU',
    apac: 'APAC', 'asia pacific': 'APAC', asia: 'APAC',
  },
  environment: {
    production: 'production', prod: 'production', live: 'production',
    staging: 'staging', stage: 'staging', 'pre-prod': 'staging',
    dev: 'dev', development: 'dev', local: 'dev',
  },
  severity: {
    critical: 'critical', crit: 'critical', p1: 'critical',
    high: 'high', p2: 'high',
    medium: 'medium', med: 'medium', p3: 'medium',
    low: 'low', p4: 'low',
  },
};

/**
 * Normalize a filter value to its canonical form.
 */
function normalizeFilterValue(filterKey: string, value: string): string {
  const normMap = VALUE_NORMALIZATION[filterKey];
  if (normMap) {
    const normalized = normMap[value.toLowerCase()];
    if (normalized) return normalized;
  }
  return value;
}

/**
 * Extract query filters from NLP-extracted entities.
 * Maps entity names to API filter keys (e.g., time_period → date_range).
 */
export function extractFilters(entities: ExtractedEntity[]): QueryFilters {
  const filters: QueryFilters = {};
  for (const entity of entities) {
    if (FILTER_ENTITIES.includes(entity.entity)) {
      const filterKey = ENTITY_TO_FILTER_KEY[entity.entity] || entity.entity;
      filters[filterKey] = normalizeFilterValue(filterKey, entity.value);
    }
  }
  return filters;
}

/**
 * Format filters into a human-readable label.
 */
export function formatFilters(filters: QueryFilters): string {
  const parts: string[] = [];
  if (filters.date_range) parts.push(`period: ${filters.date_range}`);
  if (filters.time_period) parts.push(`period: ${filters.time_period}`);
  if (filters.region) parts.push(`region: ${filters.region}`);
  if (filters.team) parts.push(`team: ${filters.team}`);
  if (filters.environment) parts.push(`env: ${filters.environment}`);
  if (filters.severity) parts.push(`severity: ${filters.severity}`);
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

/**
 * Try to extract filter key/value pairs directly from text when NLP doesn't catch them.
 * Handles patterns like:
 *   "filter by region US", "with region=US", "only US region"
 *   "give me sales data for region US"
 *   "in production environment", "for the sales team"
 *   "severity critical", "high severity"
 */
export function parseFilterFromText(text: string): Record<string, string> | null {
  // Don't misinterpret data operations as filters
  if (GROUP_BY_PATTERN.test(text) || SORT_PATTERN.test(text) || SUMMARY_PATTERN.test(text)) {
    return null;
  }

  const filters: Record<string, string> = {};
  const lower = text.toLowerCase();

  // Map of filter aliases to canonical filter keys (API-level keys)
  const filterAliases: Record<string, string> = {
    region: 'region', reg: 'region',
    team: 'team',
    environment: 'environment', env: 'environment',
    severity: 'severity', sev: 'severity', priority: 'severity',
    period: 'date_range', time_period: 'date_range', date_range: 'date_range',
    quarter: 'date_range', date: 'date_range',
  };

  // Known filter values — used for both pattern matching and standalone detection
  const knownValues: Record<string, string[]> = {
    region: ['us', 'eu', 'apac', 'usa', 'america', 'europe', 'asia'],
    team: ['engineering', 'sales', 'marketing', 'support', 'hr', 'finance',
           'trading', 'risk', 'treasury', 'operations', 'ops'],
    environment: ['production', 'staging', 'dev', 'prod', 'live'],
    date_range: ['today', 'this_week', 'last_week', 'this_month', 'last_month',
                 'last_quarter', 'this_quarter', 'q1', 'q2', 'q3', 'q4',
                 'ytd', 'last_year', 'this_year'],
    severity: ['critical', 'high', 'medium', 'low', 'p1', 'p2', 'p3', 'p4'],
  };

  // Pattern 1: "key=value"
  for (const [alias, canonical] of Object.entries(filterAliases)) {
    const equalsPattern = new RegExp(`\\b${alias}\\s*=\\s*([\\w]+)`, 'i');
    const match = equalsPattern.exec(lower);
    if (match && !filters[canonical]) {
      filters[canonical] = normalizeFilterValue(canonical, match[1]);
    }
  }

  // Pattern 2: "filter by <key> <value>" / "for <key> <value>" / "in <key> <value>"
  for (const [alias, canonical] of Object.entries(filterAliases)) {
    if (filters[canonical]) continue;
    const byPattern = new RegExp(`\\b(?:filter|by|with|in|for|=)\\s*${alias}\\s+(?:=\\s*)?([\\w]+)`, 'i');
    const match = byPattern.exec(lower);
    if (match) {
      filters[canonical] = normalizeFilterValue(canonical, match[1]);
    }
  }

  // Pattern 3: "<value> <key>" (e.g., "US region", "sales team")
  for (const [alias, canonical] of Object.entries(filterAliases)) {
    if (filters[canonical]) continue;
    const reversePattern = new RegExp(`\\b([\\w]+)\\s+${alias}\\b`, 'i');
    const match = reversePattern.exec(lower);
    if (match && knownValues[canonical]?.includes(match[1].toLowerCase())) {
      filters[canonical] = normalizeFilterValue(canonical, match[1]);
    }
  }

  // Pattern 4: Multi-word time expressions → date_range
  if (!filters.date_range) {
    const timePatterns: [RegExp, string][] = [
      [/\bthis\s+week\b/i, 'this_week'],
      [/\blast\s+week\b/i, 'last_week'],
      [/\bthis\s+month\b/i, 'this_month'],
      [/\blast\s+month\b/i, 'last_month'],
      [/\bthis\s+quarter\b/i, 'this_quarter'],
      [/\blast\s+quarter\b/i, 'last_quarter'],
      [/\bthis\s+year\b/i, 'this_year'],
      [/\blast\s+year\b/i, 'last_year'],
      [/\byear\s+to\s+date\b/i, 'ytd'],
      [/\bytd\b/i, 'ytd'],
    ];
    for (const [pattern, value] of timePatterns) {
      if (pattern.test(lower)) {
        filters.date_range = value;
        break;
      }
    }
  }

  // Pattern 5: Detect known values with preposition context
  // e.g., "for US", "in production"
  for (const [filterKey, values] of Object.entries(knownValues)) {
    if (filters[filterKey]) continue;
    for (const val of values) {
      const contextPattern = new RegExp(`\\b(?:for|in|from|at)\\s+${val}\\b`, 'i');
      if (contextPattern.test(lower)) {
        filters[filterKey] = normalizeFilterValue(filterKey, val);
        break;
      }
    }
  }

  // Pattern 6: High-confidence standalone values (US, EU, APAC only)
  if (!filters.region) {
    for (const val of ['us', 'eu', 'apac']) {
      if (new RegExp(`\\b${val}\\b`, 'i').test(lower)) {
        filters.region = normalizeFilterValue('region', val);
        break;
      }
    }
  }

  return Object.keys(filters).length > 0 ? filters : null;
}

/**
 * Merge NLP-extracted filters with text-parsed filters.
 * NLP filters take priority; text-parsed fills gaps; explicit (form) overrides all.
 */
export function mergeFilters(
  nlpFilters: QueryFilters,
  textFilters: QueryFilters | null,
  explicitFilters?: QueryFilters
): QueryFilters {
  const merged: QueryFilters = { ...nlpFilters };
  if (textFilters) {
    for (const [key, value] of Object.entries(textFilters)) {
      if (!merged[key]) {
        merged[key] = value;
      }
    }
  }
  if (explicitFilters) {
    // Explicit (form) filters override everything
    Object.assign(merged, explicitFilters);
  }
  return merged;
}
