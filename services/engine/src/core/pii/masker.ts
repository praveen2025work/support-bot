/**
 * Apply PII masking to a CSV-shaped result based on the per-column
 * classification from `detector.ts`.
 *
 * The masker is intentionally CONSERVATIVE — when in doubt, mask more.
 * Each PII kind has its own redaction pattern designed to be:
 *   - Recognisable: an admin glancing at the result can tell it WAS
 *     an email/phone/etc., so the chart axes and tooltips still make
 *     sense.
 *   - Unrecoverable: the mask doesn't preserve enough bits to identify
 *     a specific person.
 *
 * The masker never mutates the input — it returns a new CsvData with
 * cloned rows. Callers can keep the original for an audited
 * "view-unmasked" admin path (out of scope for v1; the value-of-record
 * lives upstream of the engine anyway).
 */

import type { CsvData } from "../api-connector/csv-analyzer";
import type { PiiKind } from "./detector";

const MASK_CHAR = "*";

function maskEmail(value: string): string {
  const at = value.indexOf("@");
  if (at <= 0) return MASK_CHAR.repeat(6);
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  // Keep first letter of local, first letter of TLD, rest masked.
  const lead = local[0] ?? "";
  const dot = domain.lastIndexOf(".");
  const tld = dot >= 0 ? domain.slice(dot) : "";
  const domLead = domain[0] ?? "";
  return `${lead}***@${domLead}***${tld}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return MASK_CHAR.repeat(value.length);
  const last4 = digits.slice(-4);
  return `***-***-${last4}`;
}

function maskSsn(value: string): string {
  const digits = value.replace(/\D/g, "");
  const last4 = digits.slice(-4).padStart(4, MASK_CHAR);
  return `***-**-${last4}`;
}

function maskCreditCard(value: string): string {
  const digits = value.replace(/\D/g, "");
  const last4 = digits.slice(-4).padStart(4, MASK_CHAR);
  return `**** **** **** ${last4}`;
}

function maskPersonName(value: string): string {
  // Show only the first letter of each word, mask the rest, preserving
  // punctuation and spacing — "Alice Johnson" → "A*** J*****".
  return value.replace(/\b(\w)(\w*)/g, (_, lead, rest: string) =>
    rest ? `${lead}${MASK_CHAR.repeat(Math.min(rest.length, 5))}` : lead,
  );
}

function maskAddress(value: string): string {
  // Addresses leak too much through any partial reveal. Just length-bucket.
  if (value.length <= 8) return MASK_CHAR.repeat(value.length);
  return MASK_CHAR.repeat(8) + "…";
}

function maskDob(value: string): string {
  // Common variant: keep only the year. "1985-03-14" → "1985-**-**".
  const yearMatch = value.match(/(\d{4})/);
  if (yearMatch) return `${yearMatch[1]}-**-**`;
  return MASK_CHAR.repeat(value.length);
}

function maskSalary(value: string | number): string {
  // Salary is sensitive but useful as a range. Bucket to the nearest
  // 10k so dashboards still convey signal. Falls back to MASK if
  // non-numeric.
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (Number.isFinite(n)) {
    const bucket = Math.floor(Math.abs(n) / 10000) * 10000;
    return `~$${bucket.toLocaleString()}`;
  }
  return MASK_CHAR.repeat(5);
}

function maskIp(value: string): string {
  // Keep the /16 network prefix, mask the host part.
  const parts = value.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return MASK_CHAR.repeat(value.length);
}

function maskOne(kind: Exclude<PiiKind, null>, raw: string | number): string {
  const v = String(raw);
  if (!v) return v;
  switch (kind) {
    case "email":
      return maskEmail(v);
    case "phone":
      return maskPhone(v);
    case "ssn":
      return maskSsn(v);
    case "credit_card":
      return maskCreditCard(v);
    case "person_name":
      return maskPersonName(v);
    case "address":
      return maskAddress(v);
    case "dob":
      return maskDob(v);
    case "salary":
      return maskSalary(raw);
    case "ip_address":
      return maskIp(v);
    default:
      return MASK_CHAR.repeat(Math.min(v.length, 8));
  }
}

/**
 * Returns a new CsvData with PII columns masked per the kind map.
 * Columns not in `piiMap` pass through unchanged.
 */
export function applyPiiMasking(
  data: CsvData,
  piiMap: Record<string, Exclude<PiiKind, null>>,
): CsvData {
  const piiColumns = Object.keys(piiMap);
  if (piiColumns.length === 0) return data;

  const maskedRows = data.rows.map((row) => {
    const next: Record<string, string | number> = { ...row };
    for (const col of piiColumns) {
      const v = row[col];
      if (v == null || v === "") continue;
      next[col] = maskOne(piiMap[col], v);
    }
    return next;
  });

  return {
    headers: data.headers,
    rows: maskedRows,
  };
}
