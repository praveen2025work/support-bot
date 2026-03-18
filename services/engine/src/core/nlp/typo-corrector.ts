import { logger } from '@/lib/logger';

// Common word dictionary for the chatbot domain
const COMMON_WORDS = new Set([
  // Query-related
  'query', 'queries', 'run', 'execute', 'show', 'get', 'find', 'list', 'search',
  'filter', 'filters', 'results', 'result', 'data', 'report', 'reports',
  // Time-related
  'today', 'yesterday', 'week', 'month', 'year', 'quarter', 'daily', 'monthly',
  'weekly', 'last', 'this', 'previous', 'current', 'recent',
  // Actions
  'help', 'hello', 'hi', 'hey', 'thanks', 'thank', 'bye', 'goodbye',
  'please', 'can', 'could', 'would', 'want', 'need', 'give', 'tell',
  // Domain
  'revenue', 'sales', 'users', 'active', 'performance', 'metrics',
  'status', 'summary', 'total', 'average', 'avg', 'count', 'top', 'bottom',
  'sum', 'min', 'max', 'mean', 'minimum', 'maximum', 'highest', 'lowest',
  'compare', 'comparison', 'trend', 'trends', 'growth',
  // Data operations
  'sort', 'sorted', 'group', 'grouped', 'calculate', 'aggregate',
  // Regions/filters
  'region', 'environment', 'team', 'production', 'staging', 'development',
  'engineering', 'marketing', 'finance', 'analytics',
  // Connectors
  'for', 'the', 'in', 'on', 'by', 'from', 'to', 'with', 'of', 'and', 'or',
  'about', 'what', 'how', 'when', 'where', 'which', 'all', 'me', 'my',
]);

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function findClosestWord(word: string, maxDistance = 2): string | null {
  if (word.length <= 2) return null; // Don't correct very short words
  if (COMMON_WORDS.has(word)) return null; // Already correct

  // For short words (3-4 chars), require distance ≤ 1 to avoid
  // bad corrections like "pnl"→"in", "name"→"me", "pro"→"from"
  const effectiveMax = word.length <= 4 ? 1 : maxDistance;

  let bestWord: string | null = null;
  let bestDist = effectiveMax + 1;

  for (const dictWord of Array.from(COMMON_WORDS)) {
    // Skip if length difference is too large
    if (Math.abs(dictWord.length - word.length) > effectiveMax) continue;

    const dist = levenshteinDistance(word, dictWord);
    if (dist < bestDist) {
      bestDist = dist;
      bestWord = dictWord;
    }
  }

  return bestDist <= effectiveMax ? bestWord : null;
}

export interface TypoCorrectionResult {
  corrected: string;
  original: string;
  corrections: Array<{ from: string; to: string }>;
  wasCorrected: boolean;
}

export function correctTypos(text: string): TypoCorrectionResult {
  const words = text.split(/\s+/);
  const corrections: Array<{ from: string; to: string }> = [];
  const correctedWords = words.map((word) => {
    // Preserve punctuation
    const match = word.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);
    if (!match) return word;

    const [, prefix, core, suffix] = match;
    const lower = core.toLowerCase();
    const replacement = findClosestWord(lower);

    if (replacement && replacement !== lower) {
      corrections.push({ from: core, to: replacement });
      logger.debug({ from: core, to: replacement }, 'Typo corrected');
      return prefix + replacement + suffix;
    }
    return word;
  });

  const corrected = correctedWords.join(' ');
  return {
    corrected,
    original: text,
    corrections,
    wasCorrected: corrections.length > 0,
  };
}

/** Add domain-specific words to the dictionary at runtime */
export function addToDictionary(words: string[]): void {
  for (const w of words) {
    COMMON_WORDS.add(w.toLowerCase());
  }
}
