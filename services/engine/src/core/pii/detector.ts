/**
 * PII (Personally Identifiable Information) detection over CSV-shaped
 * query results. Runs on the engine after a query returns, BEFORE the
 * response is shipped to the chat / dashboard / export pipeline.
 *
 * The detector uses two layered signals:
 *   1. Column-name heuristics — a column called `email` is almost
 *      certainly an email even if its first 50 rows are blank.
 *   2. Sampled-value regex — if 60%+ of non-empty sampled values match
 *      a known PII pattern, the column is classified as that kind.
 *
 * False positives are preferred to false negatives in this layer.
 * Downstream `masker.ts` is the one that actually obscures values, and
 * an admin can override at the group level (see piiOverrides in the
 * group config schema — to be added in a follow-up commit).
 */

import type { CsvData } from "../api-connector/csv-analyzer";

export type PiiKind =
  | "email"
  | "phone"
  | "ssn"
  | "credit_card"
  | "person_name"
  | "address"
  | "dob"
  | "salary"
  | "ip_address"
  | null;

export interface PiiDetectionResult {
  /** Per-column classification. Columns not in this map are non-PII. */
  byColumn: Record<string, Exclude<PiiKind, null>>;
  /** Total PII columns detected (length of byColumn). */
  count: number;
  /** Per-column detection signal: "header" (column name only),
   *  "value" (sampled values matched), or "both". Used by the admin
   *  UI to show why a flag fired. */
  signals: Record<string, "header" | "value" | "both">;
}

// ── Column-name heuristics ────────────────────────────────────────────

const HEADER_PATTERNS: Array<{ kind: Exclude<PiiKind, null>; re: RegExp }> = [
  { kind: "email", re: /\b(e[-_ ]?mail|email[_ ]?address|email_id)\b/i },
  {
    kind: "phone",
    re: /\b(phone|telephone|mobile|cell|fax|phone[_ ]?number)\b/i,
  },
  {
    kind: "ssn",
    re: /\b(ssn|social[_ ]?security|nat[_ ]?id|national[_ ]?id|tax[_ ]?id|sin)\b/i,
  },
  {
    kind: "credit_card",
    re: /\b(credit[_ ]?card|card[_ ]?number|cc[_ ]?num|pan|account[_ ]?number)\b/i,
  },
  {
    kind: "person_name",
    re: /^(name|full[_ ]?name|first[_ ]?name|last[_ ]?name|employee[_ ]?name|customer[_ ]?name|user[_ ]?name|display[_ ]?name|given[_ ]?name|surname|family[_ ]?name)$/i,
  },
  {
    kind: "address",
    re: /\b(address|street|street[_ ]?address|home[_ ]?address|postal[_ ]?code|zip|zipcode|postcode)\b/i,
  },
  {
    kind: "dob",
    re: /\b(dob|date[_ ]?of[_ ]?birth|birth[_ ]?date|birthday)\b/i,
  },
  {
    kind: "salary",
    re: /\b(salary|comp(ensation)?|pay[_ ]?rate|wage|annual[_ ]?pay|base[_ ]?pay|bonus|total[_ ]?comp)\b/i,
  },
  {
    kind: "ip_address",
    re: /\b(ip[_ ]?address|client[_ ]?ip|remote[_ ]?ip|ipv4|ipv6)\b/i,
  },
];

// ── Value-pattern heuristics ──────────────────────────────────────────
//
// These run on a sample of up to SAMPLE_SIZE non-empty cells per column.
// A column is classified by value if ≥ VALUE_MATCH_THRESHOLD of the
// sampled cells match the regex. The thresholds favor precision: we'd
// rather miss a sparse PII column than label numeric IDs as SSNs.

const SAMPLE_SIZE = 50;
const VALUE_MATCH_THRESHOLD = 0.6;

const VALUE_PATTERNS: Array<{ kind: Exclude<PiiKind, null>; re: RegExp }> = [
  { kind: "email", re: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/ },
  // E.164-ish phone: optional +, 7-15 digits, allow dashes/spaces/parens
  { kind: "phone", re: /^\+?[\d][\d\-\s().]{6,18}\d$/ },
  // US-shaped SSN. International tax-IDs vary; admin override is the
  // right path for those (will add piiOverrides in a follow-up).
  { kind: "ssn", re: /^\d{3}-\d{2}-\d{4}$/ },
  // 13-19 digit number with optional spaces or dashes — covers all
  // major card BINs. Luhn-check happens in the masker, not here.
  { kind: "credit_card", re: /^\d[\d\s-]{11,21}\d$/ },
  // IPv4. IPv6 is rare in business data; skip.
  { kind: "ip_address", re: /^(\d{1,3}\.){3}\d{1,3}$/ },
];

function classifyByHeader(header: string): Exclude<PiiKind, null> | null {
  for (const { kind, re } of HEADER_PATTERNS) {
    if (re.test(header)) return kind;
  }
  return null;
}

function classifyByValue(
  rows: CsvData["rows"],
  column: string,
): Exclude<PiiKind, null> | null {
  // Collect up to SAMPLE_SIZE non-empty samples
  const samples: string[] = [];
  for (const row of rows) {
    if (samples.length >= SAMPLE_SIZE) break;
    const v = row[column];
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    samples.push(s);
  }
  if (samples.length === 0) return null;

  // Try each pattern, count matches, return the FIRST pattern that
  // clears the threshold. Order matters: email before phone (phone is
  // looser), SSN before credit_card (credit_card is even looser).
  for (const { kind, re } of VALUE_PATTERNS) {
    let matched = 0;
    for (const s of samples) if (re.test(s)) matched += 1;
    if (matched / samples.length >= VALUE_MATCH_THRESHOLD) return kind;
  }
  return null;
}

export function detectPii(data: CsvData): PiiDetectionResult {
  const byColumn: Record<string, Exclude<PiiKind, null>> = {};
  const signals: Record<string, "header" | "value" | "both"> = {};

  for (const header of data.headers) {
    const headerKind = classifyByHeader(header);
    const valueKind = classifyByValue(data.rows, header);

    // Reconcile: when both fire, prefer the value-kind because it's
    // grounded in actual data. When only one fires, use that one.
    let kind: Exclude<PiiKind, null> | null = null;
    let signal: "header" | "value" | "both" | null = null;
    if (headerKind && valueKind) {
      kind = valueKind;
      signal = "both";
    } else if (valueKind) {
      kind = valueKind;
      signal = "value";
    } else if (headerKind) {
      kind = headerKind;
      signal = "header";
    }

    if (kind && signal) {
      byColumn[header] = kind;
      signals[header] = signal;
    }
  }

  return { byColumn, count: Object.keys(byColumn).length, signals };
}
