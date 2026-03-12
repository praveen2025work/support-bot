import type { ExtractedEntity } from '../types';

const MONTH_MAP: Record<string, string> = {
  january: 'jan', february: 'feb', march: 'mar', april: 'apr',
  may: 'may', june: 'jun', july: 'jul', august: 'aug',
  september: 'sep', october: 'oct', november: 'nov', december: 'dec',
  jan: 'jan', feb: 'feb', mar: 'mar', apr: 'apr',
  jun: 'jun', jul: 'jul', aug: 'aug',
  sep: 'sep', oct: 'oct', nov: 'nov', dec: 'dec',
};

const MONTH_PATTERN = Object.keys(MONTH_MAP).join('|');

// Matches: "Jan 2026", "January 2026", "jan-2026", "2026-01", "Q1 2026", etc.
const PATTERNS: { regex: RegExp; toValue: (m: RegExpMatchArray) => string }[] = [
  {
    // "Jan 2026", "January 2026", "feb 2025"
    regex: new RegExp(`\\b(${MONTH_PATTERN})[\\s_-]?(\\d{4})\\b`, 'i'),
    toValue: (m) => `${MONTH_MAP[m[1].toLowerCase()]}_${m[2]}`,
  },
  {
    // "2026-01", "2025-12" (ISO month)
    regex: /\b(\d{4})[-/](0[1-9]|1[0-2])\b/,
    toValue: (m) => {
      const monthIdx = parseInt(m[2], 10) - 1;
      const shorts = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      return `${shorts[monthIdx]}_${m[1]}`;
    },
  },
  {
    // "Q1 2026", "q3 2025"
    regex: /\bQ([1-4])[\s_-]?(\d{4})\b/i,
    toValue: (m) => `q${m[1]}_${m[2]}`,
  },
];

/**
 * Extracts date/time entities from text using regex patterns.
 * This runs as post-processing after NLP classification to catch
 * dynamic date references (e.g., "Jan 2026") that aren't in the corpus.
 */
export function extractDateEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  for (const { regex, toValue } of PATTERNS) {
    const match = text.match(regex);
    if (match) {
      entities.push({
        entity: 'time_period',
        value: toValue(match),
        start: match.index ?? 0,
        end: (match.index ?? 0) + match[0].length,
      });
      break; // Take the first match only
    }
  }

  return entities;
}
