import type { QueryFilters } from '../../api-connector/types';
import type { ExtractedEntity } from '../../types';
import {
  FILTER_ENTITIES,
  GROUP_BY_PATTERN,
  SORT_PATTERN,
  SUMMARY_PATTERN,
} from '../constants';

/**
 * Extract query filters from NLP-extracted entities.
 */
export function extractFilters(entities: ExtractedEntity[]): QueryFilters {
  const filters: QueryFilters = {};
  for (const entity of entities) {
    if (FILTER_ENTITIES.includes(entity.entity)) {
      filters[entity.entity] = entity.value;
    }
  }
  return filters;
}

/**
 * Format filters into a human-readable label.
 */
export function formatFilters(filters: QueryFilters): string {
  const parts: string[] = [];
  if (filters.time_period) parts.push(`period: ${filters.time_period}`);
  if (filters.region) parts.push(`region: ${filters.region}`);
  if (filters.team) parts.push(`team: ${filters.team}`);
  if (filters.environment) parts.push(`env: ${filters.environment}`);
  if (filters.severity) parts.push(`severity: ${filters.severity}`);
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

/**
 * Try to extract filter key/value pairs directly from text when NLP doesn't catch them.
 * Handles patterns like "filter by region US", "with region=US", "only US region"
 */
export function parseFilterFromText(text: string): Record<string, string> | null {
  // Don't misinterpret data operations as filters
  if (GROUP_BY_PATTERN.test(text) || SORT_PATTERN.test(text) || SUMMARY_PATTERN.test(text)) {
    return null;
  }

  const filters: Record<string, string> = {};
  const lower = text.toLowerCase();

  // Map of filter aliases to canonical names
  const filterAliases: Record<string, string> = {
    region: 'region', reg: 'region',
    team: 'team',
    environment: 'environment', env: 'environment',
    severity: 'severity', sev: 'severity',
    period: 'time_period', time_period: 'time_period', quarter: 'time_period',
  };

  // Known filter values
  const knownValues: Record<string, string[]> = {
    region: ['us', 'eu', 'apac', 'latam', 'global'],
    team: ['engineering', 'sales', 'marketing', 'support', 'hr', 'finance'],
    environment: ['production', 'staging', 'dev', 'prod'],
    time_period: ['today', 'this_week', 'last_week', 'last_month', 'last_quarter', 'q1', 'q2', 'q3', 'q4'],
  };

  // Pattern: "filter by <key> <value>" or "<key> <value>" or "with <value> <key>"
  for (const [alias, canonical] of Object.entries(filterAliases)) {
    const byPattern = new RegExp(`\\b(?:filter|by|with|=)\\s*${alias}\\s+(?:=\\s*)?([\\w]+)`, 'i');
    const reversePattern = new RegExp(`\\b([\\w]+)\\s+${alias}\\b`, 'i');

    let match = byPattern.exec(lower);
    if (match) {
      filters[canonical] = match[1].toUpperCase();
      continue;
    }

    match = reversePattern.exec(lower);
    if (match && knownValues[canonical]?.includes(match[1].toLowerCase())) {
      filters[canonical] = match[1].toUpperCase();
    }
  }

  // Also try: detect known values standalone (e.g., just "US" or "only US")
  if (Object.keys(filters).length === 0) {
    for (const [filterKey, values] of Object.entries(knownValues)) {
      for (const val of values) {
        if (new RegExp(`\\b${val}\\b`, 'i').test(lower)) {
          filters[filterKey] = val.toUpperCase();
          break;
        }
      }
    }
  }

  return Object.keys(filters).length > 0 ? filters : null;
}
