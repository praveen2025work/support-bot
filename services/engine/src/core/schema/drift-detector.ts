/**
 * Compute schema drift between a stored column list and a freshly
 * observed one. The output is the "what changed" report the chat
 * handler attaches to the response and the admin UI surfaces in a
 * "needs attention" panel.
 *
 * Drift categories (in order of severity for the admin UI):
 *   1. removed   — columns the user asked for in the corpus may now
 *                  be missing. Most likely to cause silent breakage.
 *   2. added     — new columns that nobody knows to ask for. Probably
 *                  fine but worth surfacing.
 *   3. reordered — same set, different order. Almost always benign
 *                  but flagged because chart layouts can depend on
 *                  column position.
 *
 * Renames aren't detected explicitly in v1 — admin sees a removed and
 * an added column at similar positions and infers the rename. A v2
 * could do a Levenshtein + type-similarity match to guess the rename.
 */

export interface SchemaDrift {
  added: string[];
  removed: string[];
  /** Present when the column SET is unchanged but the ORDER differs.
   *  Contains the stored order so admins can see what changed. */
  reorderedFrom?: string[];
  /** True when there's a meaningful change worth showing the user */
  hasChange: boolean;
}

export function detectDrift(
  storedColumns: readonly string[] | null,
  currentColumns: readonly string[],
): SchemaDrift | null {
  if (!storedColumns) {
    // First time we've seen this query — no drift, just establish baseline.
    return null;
  }

  const storedSet = new Set(storedColumns);
  const currentSet = new Set(currentColumns);

  const removed: string[] = [];
  for (const c of storedColumns) if (!currentSet.has(c)) removed.push(c);

  const added: string[] = [];
  for (const c of currentColumns) if (!storedSet.has(c)) added.push(c);

  if (removed.length === 0 && added.length === 0) {
    // Same column SET; check order.
    let reordered = false;
    for (let i = 0; i < storedColumns.length; i++) {
      if (storedColumns[i] !== currentColumns[i]) {
        reordered = true;
        break;
      }
    }
    if (!reordered) return null;
    return {
      added: [],
      removed: [],
      reorderedFrom: [...storedColumns],
      hasChange: true,
    };
  }

  return {
    added,
    removed,
    hasChange: true,
  };
}

export function formatDriftMessage(drift: SchemaDrift): string {
  const parts: string[] = [];
  if (drift.removed.length > 0) {
    parts.push(
      `${drift.removed.length} column${drift.removed.length === 1 ? "" : "s"} removed (${drift.removed.join(", ")})`,
    );
  }
  if (drift.added.length > 0) {
    parts.push(
      `${drift.added.length} new column${drift.added.length === 1 ? "" : "s"} (${drift.added.join(", ")})`,
    );
  }
  if (drift.reorderedFrom && drift.reorderedFrom.length > 0) {
    parts.push("column order changed");
  }
  return parts.join("; ");
}
