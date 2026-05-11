/**
 * Lightweight domain synonym expander — no external dependencies (no WordNet).
 * Provides synonym groups for finance, business, and general domains.
 * Used to bridge vocabulary gaps in FAQ matching and search.
 *
 * Per-group synonyms are loaded from `paths.data.synonymsFile(groupId)` if the
 * file exists. Admins can manage these via the per-group synonyms admin UI.
 */

import { existsSync, readFileSync } from "fs";
import { logger } from "@/lib/logger";
import { paths } from "@/lib/env-config";

// Each array is a synonym group — any term maps to all others in the group
const SYNONYM_GROUPS: string[][] = [
  // Finance / Revenue
  ["revenue", "income", "earnings", "sales", "turnover"],
  ["profit", "margin", "earnings", "gain", "return"],
  ["cost", "expense", "expenditure", "spend", "outlay", "price"],
  ["loss", "deficit", "shortfall", "decline"],
  ["budget", "allocation", "forecast", "projection"],

  // Trading / Markets
  ["trade", "transaction", "deal", "execution", "order"],
  ["position", "holding", "exposure", "allocation"],
  ["volatility", "fluctuation", "variance", "swing"],
  ["portfolio", "holdings", "investments", "assets"],
  ["market", "exchange", "bourse"],

  // Risk / Compliance
  ["risk", "exposure", "liability", "vulnerability", "threat"],
  ["compliance", "regulatory", "regulation", "oversight", "governance"],
  ["audit", "review", "inspection", "examination", "assessment"],
  ["fraud", "misconduct", "violation", "breach"],
  ["policy", "rule", "guideline", "regulation", "procedure"],

  // Operations
  ["settlement", "clearing", "reconciliation", "resolution"],
  ["failure", "error", "exception", "break", "discrepancy"],
  ["process", "procedure", "workflow", "pipeline", "flow"],
  ["performance", "efficiency", "throughput", "productivity"],

  // Client / Customer
  ["client", "customer", "counterparty", "account"],
  ["onboarding", "enrollment", "registration", "signup"],

  // General business
  ["report", "summary", "overview", "dashboard", "analysis"],
  ["metric", "measure", "indicator", "kpi", "statistic"],
  ["increase", "growth", "rise", "gain", "improvement"],
  ["decrease", "decline", "drop", "reduction", "fall"],
  ["calculate", "compute", "determine", "estimate", "evaluate"],
  ["show", "display", "present", "view", "list"],
  ["find", "search", "locate", "look up", "retrieve"],
  ["create", "generate", "produce", "build", "make"],
  ["update", "modify", "change", "edit", "revise"],
  ["delete", "remove", "cancel", "void", "terminate"],

  // Time
  ["daily", "day", "everyday", "per day"],
  ["monthly", "month", "per month"],
  ["quarterly", "quarter", "q1", "q2", "q3", "q4"],
  ["yearly", "annual", "annually", "per year", "year"],
  ["current", "latest", "recent", "today", "now"],
  ["previous", "last", "prior", "former", "past"],

  // Treasury
  ["liquidity", "cash", "funds", "capital"],
  ["interest", "rate", "yield", "coupon"],
  ["loan", "credit", "lending", "borrowing", "advance"],
  ["deposit", "savings", "balance"],
];

// Build a fast lookup: term → set of synonyms
const synonymMap = new Map<string, Set<string>>();

function addGroupToMap(
  target: Map<string, Set<string>>,
  group: string[],
): void {
  const lowered = group.map((t) => t.toLowerCase().trim()).filter(Boolean);
  for (const term of lowered) {
    if (!target.has(term)) {
      target.set(term, new Set<string>());
    }
    for (const other of lowered) {
      if (other !== term) {
        target.get(term)!.add(other);
      }
    }
  }
}

for (const group of SYNONYM_GROUPS) {
  addGroupToMap(synonymMap, group);
}

// Per-group synonym maps loaded from disk. Cached to avoid re-reading on every
// expandWithSynonyms call. Admin route invalidates via clearGroupSynonymsCache.
const groupSynonymCache = new Map<string, Map<string, Set<string>>>();

/**
 * Schema for per-group synonyms file.
 * Stored at `paths.data.synonymsFile(groupId)`.
 */
export interface GroupSynonymEntry {
  canonical: string;
  synonyms: string[];
  updatedAt: string;
  updatedBy?: string;
}

function isGroupSynonymEntry(value: unknown): value is GroupSynonymEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.canonical === "string" &&
    Array.isArray(v.synonyms) &&
    v.synonyms.every((s) => typeof s === "string") &&
    typeof v.updatedAt === "string"
  );
}

/**
 * Build a synonym lookup map from a list of canonical/synonym entries.
 * Each entry is treated as a group containing the canonical plus all its synonyms.
 */
function buildGroupSynonymMap(
  entries: GroupSynonymEntry[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const entry of entries) {
    const group = [entry.canonical, ...entry.synonyms];
    addGroupToMap(map, group);
  }
  return map;
}

/**
 * Load per-group synonyms from disk. Returns a fresh map every call.
 * Returns an empty map (never throws) when the file is missing or malformed.
 */
function loadGroupSynonyms(groupId: string): Map<string, Set<string>> {
  const filePath = paths.data.synonymsFile(groupId);
  if (!existsSync(filePath)) {
    return new Map();
  }
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      logger.warn(
        { groupId, filePath },
        "synonym-expander: per-group synonyms file is not an array — ignoring",
      );
      return new Map();
    }
    const entries = parsed.filter(isGroupSynonymEntry) as GroupSynonymEntry[];
    if (entries.length !== parsed.length) {
      logger.warn(
        { groupId, filePath, valid: entries.length, total: parsed.length },
        "synonym-expander: some entries in per-group synonyms file are malformed",
      );
    }
    return buildGroupSynonymMap(entries);
  } catch (err) {
    logger.warn(
      { err, groupId, filePath },
      "synonym-expander: failed to load per-group synonyms — falling back to defaults",
    );
    return new Map();
  }
}

/**
 * Public: clear the per-group synonyms cache for a given groupId.
 * Called by the admin route after a synonym mutation so the next NLP call
 * picks up the new file contents.
 */
export function clearGroupSynonymsCache(groupId?: string): void {
  if (groupId === undefined) {
    groupSynonymCache.clear();
    return;
  }
  groupSynonymCache.delete(groupId);
}

function getGroupSynonymMap(groupId: string): Map<string, Set<string>> {
  const cached = groupSynonymCache.get(groupId);
  if (cached) return cached;
  const fresh = loadGroupSynonyms(groupId);
  groupSynonymCache.set(groupId, fresh);
  return fresh;
}

/**
 * Get synonyms for a word. Returns empty set if no synonyms found.
 * If `groupId` is provided, per-group synonyms (loaded from
 * `paths.data.synonymsFile(groupId)`) are merged with the static defaults.
 */
export function getSynonyms(word: string, groupId?: string): Set<string> {
  const lower = word.toLowerCase();
  const baseSet = synonymMap.get(lower);
  if (!groupId) {
    return baseSet ? new Set(baseSet) : new Set();
  }
  const groupMap = getGroupSynonymMap(groupId);
  const groupSet = groupMap.get(lower);
  if (!baseSet && !groupSet) return new Set();
  const merged = new Set<string>(baseSet ?? []);
  if (groupSet) {
    groupSet.forEach((syn) => merged.add(syn));
  }
  return merged;
}

/**
 * Expand a text query with synonyms.
 * Returns the original words plus any synonym alternatives.
 * If `groupId` is provided, per-group synonyms are mixed in alongside defaults.
 */
export function expandWithSynonyms(text: string, groupId?: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  const expanded: string[] = [...words];
  const seen = new Set<string>();
  words.forEach((w) => seen.add(w));

  for (const word of words) {
    const syns = getSynonyms(word, groupId);
    syns.forEach((syn) => {
      // Only add single-word synonyms to avoid inflating the query
      if (!syn.includes(" ") && !seen.has(syn)) {
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
 * If `groupId` is provided, per-group synonyms are mixed in alongside defaults.
 */
export function generateSynonymVariants(
  question: string,
  maxVariants: number = 3,
  groupId?: string,
): string[] {
  const words = question.toLowerCase().split(/\s+/);
  const variants: string[] = [];

  // For each word that has synonyms, create a variant with the synonym swapped in
  for (const word of words) {
    if (variants.length >= maxVariants) break;
    const syns = getSynonyms(word, groupId);
    if (syns.size === 0) continue;

    // Pick the first synonym and create a variant
    let firstSyn: string | undefined;
    syns.forEach((s) => {
      if (!firstSyn) firstSyn = s;
    });
    if (firstSyn && !firstSyn.includes(" ")) {
      const variant = words.map((w) => (w === word ? firstSyn : w)).join(" ");
      if (variant !== question.toLowerCase()) {
        variants.push(variant);
      }
    }
  }

  return variants;
}
