/**
 * SQL query executor utilities.
 * Read-only enforcement, pagination, and row limit helpers.
 */

import { logger } from "@/lib/logger";

const MUTATION_PATTERNS = [
  /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|MERGE|REPLACE)\b/i,
  /^\s*EXEC(UTE)?\b/i,
  /;\s*(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|MERGE|REPLACE)\b/i,
];

const ALLOWED_PATTERNS = [
  /^\s*SELECT\b/i,
  /^\s*WITH\b/i,
  /^\s*SET\s+TRANSACTION\s+READ\s+ONLY/i,
];

export function validateReadOnly(sql: string): {
  valid: boolean;
  reason?: string;
} {
  const trimmed = sql.trim();
  for (const pattern of MUTATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        reason: `SQL statement blocked: matches mutation pattern ${pattern.source}`,
      };
    }
  }
  const isAllowed = ALLOWED_PATTERNS.some((p) => p.test(trimmed));
  if (!isAllowed) {
    return {
      valid: false,
      reason: "SQL statement must start with SELECT or WITH (CTE)",
    };
  }
  return { valid: true };
}

export function validateProcedureCall(procedureName: string): {
  valid: boolean;
  reason?: string;
} {
  if (/[;'"\\]/.test(procedureName)) {
    return { valid: false, reason: "Invalid characters in procedure name" };
  }
  if (!/^[\w.]+$/.test(procedureName)) {
    return {
      valid: false,
      reason: "Procedure name must be a valid SQL identifier",
    };
  }
  return { valid: true };
}

/**
 * Inject `TOP (n)` into a SELECT so SQL Server stops producing rows early
 * instead of shipping the entire recordset for Node to slice afterwards.
 *
 * SAFETY: only injects when the statement is an unambiguous top-level SELECT
 * with no existing TOP/OFFSET. CTEs (WITH …), stored-proc calls (EXEC …) and
 * anything else are left untouched so the caller falls back to the post-fetch
 * `enforceRowLimit` safety net (no behavioural regression).
 *
 * Returns the (possibly) rewritten SQL and whether an injection happened.
 */
export function injectTopLimit(
  sql: string,
  limit: number,
): { sql: string; injected: boolean } {
  if (!Number.isFinite(limit) || limit <= 0) {
    return { sql, injected: false };
  }

  const trimmed = sql.trim();

  // Must be a single top-level SELECT (allow leading `SELECT DISTINCT`).
  // Reject WITH/CTE and EXEC/stored-proc — only `SELECT` is safe to rewrite.
  const selectMatch = /^select(\s+distinct)?\b/i.exec(trimmed);
  if (!selectMatch) {
    return { sql, injected: false };
  }

  // Bail if a TOP or OFFSET is already present — never override author intent.
  if (/\bTOP\s*\(/i.test(trimmed) || /\bTOP\s+\d/i.test(trimmed)) {
    return { sql, injected: false };
  }
  if (/\bOFFSET\b/i.test(trimmed)) {
    return { sql, injected: false };
  }

  // Insert `TOP (n)` immediately after `SELECT` (or `SELECT DISTINCT`).
  const insertAt = selectMatch[0].length;
  const rewritten =
    trimmed.slice(0, insertAt) + ` TOP (${limit})` + trimmed.slice(insertAt);
  return { sql: rewritten, injected: true };
}

export function enforceRowLimit<T>(
  rows: T[],
  maxRows: number,
): {
  rows: T[];
  truncated: boolean;
  totalRowsBeforeTruncation: number;
} {
  const total = rows.length;
  if (total <= maxRows) {
    return { rows, truncated: false, totalRowsBeforeTruncation: total };
  }
  logger.warn(
    { actual: total, limit: maxRows },
    "Query result truncated to row limit",
  );
  return {
    rows: rows.slice(0, maxRows),
    truncated: true,
    totalRowsBeforeTruncation: total,
  };
}
