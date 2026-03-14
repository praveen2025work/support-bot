/**
 * Lightweight domain synonym expander — no external dependencies (no WordNet).
 * Provides synonym groups for finance, business, and general domains.
 * Used to bridge vocabulary gaps in FAQ matching and search.
 */

// Each array is a synonym group — any term maps to all others in the group
const SYNONYM_GROUPS: string[][] = [
  // Finance / Revenue
  ['revenue', 'income', 'earnings', 'sales', 'turnover'],
  ['profit', 'margin', 'earnings', 'gain', 'return'],
  ['cost', 'expense', 'expenditure', 'spend', 'outlay', 'price'],
  ['loss', 'deficit', 'shortfall', 'decline'],
  ['budget', 'allocation', 'forecast', 'projection'],

  // Trading / Markets
  ['trade', 'transaction', 'deal', 'execution', 'order'],
  ['position', 'holding', 'exposure', 'allocation'],
  ['volatility', 'fluctuation', 'variance', 'swing'],
  ['portfolio', 'holdings', 'investments', 'assets'],
  ['market', 'exchange', 'bourse'],

  // Risk / Compliance
  ['risk', 'exposure', 'liability', 'vulnerability', 'threat'],
  ['compliance', 'regulatory', 'regulation', 'oversight', 'governance'],
  ['audit', 'review', 'inspection', 'examination', 'assessment'],
  ['fraud', 'misconduct', 'violation', 'breach'],
  ['policy', 'rule', 'guideline', 'regulation', 'procedure'],

  // Operations
  ['settlement', 'clearing', 'reconciliation', 'resolution'],
  ['failure', 'error', 'exception', 'break', 'discrepancy'],
  ['process', 'procedure', 'workflow', 'pipeline', 'flow'],
  ['performance', 'efficiency', 'throughput', 'productivity'],

  // Client / Customer
  ['client', 'customer', 'counterparty', 'account'],
  ['onboarding', 'enrollment', 'registration', 'signup'],

  // General business
  ['report', 'summary', 'overview', 'dashboard', 'analysis'],
  ['metric', 'measure', 'indicator', 'kpi', 'statistic'],
  ['increase', 'growth', 'rise', 'gain', 'improvement'],
  ['decrease', 'decline', 'drop', 'reduction', 'fall'],
  ['calculate', 'compute', 'determine', 'estimate', 'evaluate'],
  ['show', 'display', 'present', 'view', 'list'],
  ['find', 'search', 'locate', 'look up', 'retrieve'],
  ['create', 'generate', 'produce', 'build', 'make'],
  ['update', 'modify', 'change', 'edit', 'revise'],
  ['delete', 'remove', 'cancel', 'void', 'terminate'],

  // Time
  ['daily', 'day', 'everyday', 'per day'],
  ['monthly', 'month', 'per month'],
  ['quarterly', 'quarter', 'q1', 'q2', 'q3', 'q4'],
  ['yearly', 'annual', 'annually', 'per year', 'year'],
  ['current', 'latest', 'recent', 'today', 'now'],
  ['previous', 'last', 'prior', 'former', 'past'],

  // Treasury
  ['liquidity', 'cash', 'funds', 'capital'],
  ['interest', 'rate', 'yield', 'coupon'],
  ['loan', 'credit', 'lending', 'borrowing', 'advance'],
  ['deposit', 'savings', 'balance'],
];

// Build a fast lookup: term → set of synonyms
const synonymMap = new Map<string, Set<string>>();

for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    const lower = term.toLowerCase();
    if (!synonymMap.has(lower)) {
      synonymMap.set(lower, new Set<string>());
    }
    for (const other of group) {
      const otherLower = other.toLowerCase();
      if (otherLower !== lower) {
        synonymMap.get(lower)!.add(otherLower);
      }
    }
  }
}

/**
 * Get synonyms for a word. Returns empty set if no synonyms found.
 */
export function getSynonyms(word: string): Set<string> {
  return synonymMap.get(word.toLowerCase()) || new Set();
}

/**
 * Expand a text query with synonyms.
 * Returns the original words plus any synonym alternatives.
 */
export function expandWithSynonyms(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  const expanded: string[] = [...words];
  const seen = new Set<string>();
  words.forEach((w) => seen.add(w));

  for (const word of words) {
    const syns = getSynonyms(word);
    syns.forEach((syn) => {
      // Only add single-word synonyms to avoid inflating the query
      if (!syn.includes(' ') && !seen.has(syn)) {
        seen.add(syn);
        expanded.push(syn);
      }
    });
  }

  return expanded;
}

/**
 * Expand a FAQ question text with synonym variants.
 * Returns additional question phrasings using synonyms.
 */
export function generateSynonymVariants(question: string, maxVariants: number = 3): string[] {
  const words = question.toLowerCase().split(/\s+/);
  const variants: string[] = [];

  // For each word that has synonyms, create a variant with the synonym swapped in
  for (const word of words) {
    if (variants.length >= maxVariants) break;
    const syns = getSynonyms(word);
    if (syns.size === 0) continue;

    // Pick the first synonym and create a variant
    let firstSyn: string | undefined;
    syns.forEach((s) => { if (!firstSyn) firstSyn = s; });
    if (firstSyn && !firstSyn.includes(' ')) {
      const variant = words.map((w) => (w === word ? firstSyn : w)).join(' ');
      if (variant !== question.toLowerCase()) {
        variants.push(variant);
      }
    }
  }

  return variants;
}
