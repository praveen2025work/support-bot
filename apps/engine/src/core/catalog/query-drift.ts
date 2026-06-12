/**
 * Corpus/catalog drift audit.
 *
 * The NLP corpus declares `query_name` entity options (one per query the
 * model can recognise), but the live per-group query registry is the real
 * source of truth for what can actually execute. When a corpus key has no
 * matching registry entry it is an "orphan": the model may still extract it,
 * but it can never run — so it must be kept out of suggestion chips and
 * disambiguation candidates.
 *
 * This module is the single, pure definition of that rule. It does no I/O and
 * imports no logger so it is trivially unit-testable; the boot path supplies
 * the names and handles warn-logging.
 */

export interface DriftAuditInput {
  /** query_name options declared in the NLP corpus */
  corpusQueryNames: Iterable<string>;
  /** query names present in the live per-group registry/catalog */
  registryQueryNames: Iterable<string>;
}

export interface DriftAuditResult {
  /** corpus keys with no matching registry entry (sorted, lowercased) */
  orphans: string[];
  /** corpus keys backed by a registry entry (sorted, lowercased) */
  matched: string[];
}

/**
 * Classify every corpus query_name as matched or orphan against the registry.
 * Matching is case-insensitive; output is de-duplicated and sorted for stable,
 * comparable results.
 */
export function auditQueryNameDrift(input: DriftAuditInput): DriftAuditResult {
  const registry = new Set<string>();
  for (const name of input.registryQueryNames) {
    if (name) registry.add(name.toLowerCase());
  }

  const orphans: string[] = [];
  const matched: string[] = [];
  const seen = new Set<string>();
  for (const raw of input.corpusQueryNames) {
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (registry.has(key)) matched.push(key);
    else orphans.push(key);
  }

  orphans.sort();
  matched.sort();
  return { orphans, matched };
}
