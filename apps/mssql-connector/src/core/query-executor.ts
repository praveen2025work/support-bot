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
