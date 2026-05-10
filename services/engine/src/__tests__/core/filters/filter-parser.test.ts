import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock logger like the rest of the engine test suite — keeps stdout clean and
// lets us assert that warning paths are exercised.
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { resolveDateRange, isDatePreset } from "@/lib/date-resolver";
import {
  extractFilters,
  parseFilterFromText,
  extractQuerySpecificFilters,
  mergeFilters,
  formatFilters,
} from "@/core/response/handlers/filter-utils";
import type { ExtractedEntity } from "@/core/types";
import type { QueryFilters } from "@/core/api-connector/types";

// ── Helpers ────────────────────────────────────────────────────────────

function makeEntity(entity: string, value: string): ExtractedEntity {
  return { entity, value, start: 0, end: value.length };
}

// Use a Wednesday in mid-quarter so weekly/monthly/quarterly logic is
// non-trivial. 2026-05-13 is a Wednesday; quarter Q2 starts 2026-04-01.
const FROZEN_DATE = new Date(2026, 4, 13, 12, 0, 0); // local time: 2026-05-13 12:00

describe("filter-parser", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── 1. Time period normalization ────────────────────────────────────

  describe("time period normalization (resolveDateRange)", () => {
    it("'today' resolves to a single-day range", () => {
      const range = resolveDateRange("today");
      expect(range).toEqual({ start: "2026-05-13", end: "2026-05-13" });
    });

    it("'this_week' resolves Monday → today (ISO week)", () => {
      // 2026-05-13 is Wednesday → Monday of this week is 2026-05-11.
      const range = resolveDateRange("this_week");
      expect(range).toEqual({ start: "2026-05-11", end: "2026-05-13" });
    });

    it("'last_week' resolves to the previous Mon → Sun span", () => {
      // Last week relative to Wed 2026-05-13: Mon 2026-05-04 → Sun 2026-05-10.
      const range = resolveDateRange("last_week");
      expect(range).toEqual({ start: "2026-05-04", end: "2026-05-10" });
    });

    it("'this_month' resolves to month start → today", () => {
      const range = resolveDateRange("this_month");
      expect(range).toEqual({ start: "2026-05-01", end: "2026-05-13" });
    });

    it("'last_month' resolves to the entire previous calendar month", () => {
      const range = resolveDateRange("last_month");
      expect(range).toEqual({ start: "2026-04-01", end: "2026-04-30" });
    });

    it("'this_quarter' resolves to quarter start → today", () => {
      // Q2 starts 2026-04-01 (April).
      const range = resolveDateRange("this_quarter");
      expect(range).toEqual({ start: "2026-04-01", end: "2026-05-13" });
    });

    it("'last_quarter' resolves to the entire previous quarter", () => {
      // Q1 = 2026-01-01 → 2026-03-31.
      const range = resolveDateRange("last_quarter");
      expect(range).toEqual({ start: "2026-01-01", end: "2026-03-31" });
    });

    it("respects a custom date format", () => {
      const range = resolveDateRange("today", "DD/MM/YYYY");
      expect(range).toEqual({ start: "13/05/2026", end: "13/05/2026" });
    });

    it("is robust to a UTC vs local-time edge: a date late in the local day still produces today's local date", () => {
      // 2026-05-13 23:30 local time. Although UTC is already 2026-05-14 in many
      // zones, resolveDateRange uses local-time field accessors so 'today' must
      // remain 2026-05-13.
      vi.setSystemTime(new Date(2026, 4, 13, 23, 30, 0));
      const range = resolveDateRange("today");
      expect(range).toEqual({ start: "2026-05-13", end: "2026-05-13" });
    });

    it("isDatePreset narrows known presets and rejects others", () => {
      expect(isDatePreset("today")).toBe(true);
      expect(isDatePreset("this_quarter")).toBe(true);
      expect(isDatePreset("last_quarter")).toBe(true);
      expect(isDatePreset("yesterday")).toBe(false);
      expect(isDatePreset("not-a-preset")).toBe(false);
      expect(isDatePreset("")).toBe(false);
    });

    it("'yesterday' is not a supported preset (engine has no yesterday handler)", () => {
      // Documents codebase behavior: only the seven presets in date-resolver.ts
      // are recognized. parseFilterFromText also has no 'yesterday' pattern.
      expect(isDatePreset("yesterday")).toBe(false);
      const filters = parseFilterFromText("show me orders yesterday");
      // No date_range produced — proves yesterday is intentionally unmapped.
      expect(filters?.date_range).toBeUndefined();
    });
  });

  // ── 2. Region / team / environment via extractFilters (NLP path) ────

  describe("extractFilters — NLP entity → filter map", () => {
    it("maps time_period entity to date_range filter key", () => {
      const out = extractFilters([makeEntity("time_period", "this_quarter")]);
      expect(out).toEqual({ date_range: "this_quarter" });
    });

    it("normalizes region values to canonical uppercase", () => {
      expect(extractFilters([makeEntity("region", "us")])).toEqual({
        region: "US",
      });
      expect(extractFilters([makeEntity("region", "USA")])).toEqual({
        region: "US",
      });
      expect(extractFilters([makeEntity("region", "europe")])).toEqual({
        region: "EU",
      });
      expect(extractFilters([makeEntity("region", "Asia Pacific")])).toEqual({
        region: "APAC",
      });
    });

    it("normalizes environment aliases to canonical names", () => {
      expect(extractFilters([makeEntity("environment", "PROD")])).toEqual({
        environment: "production",
      });
      expect(extractFilters([makeEntity("environment", "Live")])).toEqual({
        environment: "production",
      });
      expect(
        extractFilters([makeEntity("environment", "development")]),
      ).toEqual({ environment: "dev" });
    });

    it("passes team values through unchanged (no canonical map for team)", () => {
      // Team has no entry in VALUE_NORMALIZATION → identity passthrough.
      expect(extractFilters([makeEntity("team", "engineering")])).toEqual({
        team: "engineering",
      });
      expect(extractFilters([makeEntity("team", "Sales")])).toEqual({
        team: "Sales",
      });
    });

    it("ignores entities that aren't filter entities", () => {
      const out = extractFilters([
        makeEntity("query_name", "monthly_revenue"),
        makeEntity("region", "EU"),
      ]);
      expect(out).toEqual({ region: "EU" });
    });

    it("returns an empty filter map for an empty entity list", () => {
      expect(extractFilters([])).toEqual({});
    });

    it("does not crash on unknown entity values (passes through)", () => {
      // 'mars' isn't in the region map → should fall through unchanged.
      expect(extractFilters([makeEntity("region", "mars")])).toEqual({
        region: "mars",
      });
    });
  });

  // ── 3. parseFilterFromText — case-insensitive, missing values ──────

  describe("parseFilterFromText — case-insensitive text-based parsing", () => {
    it("matches lowercase region codes anywhere in text", () => {
      const out = parseFilterFromText("show me revenue for us");
      expect(out?.region).toBe("US");
    });

    it("matches uppercase region codes (case-insensitive)", () => {
      const out = parseFilterFromText("show me revenue for US");
      expect(out?.region).toBe("US");
    });

    it("returns null when no recognizable filter is in the text", () => {
      // Use plain words that won't trip any of the patterns.
      expect(parseFilterFromText("hello world goodbye")).toBeNull();
    });

    it("recognizes multi-word time expressions and maps to date_range", () => {
      expect(parseFilterFromText("revenue this quarter")?.date_range).toBe(
        "this_quarter",
      );
      expect(parseFilterFromText("orders last month")?.date_range).toBe(
        "last_month",
      );
      expect(parseFilterFromText("metrics this week")?.date_range).toBe(
        "this_week",
      );
    });

    it("supports key=value syntax", () => {
      const out = parseFilterFromText("metrics region=eu env=production");
      expect(out?.region).toBe("EU");
      expect(out?.environment).toBe("production");
    });

    it("supports preposition + value (e.g. 'in production')", () => {
      const out = parseFilterFromText("errors in production");
      expect(out?.environment).toBe("production");
    });

    it("ignores group-by / sort / summary inputs (returns null)", () => {
      expect(parseFilterFromText("group by region")).toBeNull();
      expect(parseFilterFromText("sort by revenue desc")).toBeNull();
      expect(parseFilterFromText("summary of trades")).toBeNull();
    });
  });

  // ── 4. extractQuerySpecificFilters — SQL inline filter syntax ──────

  describe("extractQuerySpecificFilters — query-specific filter pairs", () => {
    it("parses 'run order_details status Completed'", () => {
      const out = extractQuerySpecificFilters(
        "run order_details status Completed",
        ["status"],
      );
      expect(out).toEqual({ status: "Completed" });
    });

    it("parses key=value form", () => {
      const out = extractQuerySpecificFilters(
        "run order_details status=Completed",
        ["status"],
      );
      expect(out).toEqual({ status: "Completed" });
    });

    it("parses multiple custom filters in one utterance", () => {
      const out = extractQuerySpecificFilters(
        "run employee_directory Department Engineering Location SF",
        ["Department", "Location"],
      );
      expect(out).toEqual({ Department: "Engineering", Location: "SF" });
    });

    it("is case-insensitive on the filter key", () => {
      const out = extractQuerySpecificFilters(
        "run order_details STATUS Completed",
        ["status"],
      );
      expect(out).toEqual({ status: "Completed" });
    });

    it("returns an empty object when the schema declares no filter keys", () => {
      expect(extractQuerySpecificFilters("status Completed", [])).toEqual({});
    });

    it("skips noise words like 'by', 'is', 'for' as values", () => {
      // "status by" should NOT yield { status: "by" }.
      const out = extractQuerySpecificFilters("filter status by", ["status"]);
      expect(out).toEqual({});
    });

    it("does not handle standard filter keys (those go through parseFilterFromText)", () => {
      // 'region' is a "standard" key → skipped here even when present in the
      // query schema.
      const out = extractQuerySpecificFilters("run sales region US", [
        "region",
      ]);
      expect(out).toEqual({});
    });

    it("multi-word values are NOT supported — only the first token is captured (codebase limitation, documented here)", () => {
      // Quoted/multi-word values would require a richer tokenizer. The current
      // helper uses [^\s,]+ which captures only the first whitespace-delimited
      // token. This test pins the existing behavior so future changes are
      // explicit.
      const out = extractQuerySpecificFilters(
        'run order_details status "Pending Review"',
        ["status"],
      );
      // Captures only the first token after `status` — ignoring quotes.
      expect(out.status).toBe('"Pending');
    });
  });

  // ── 5. Edge cases ───────────────────────────────────────────────────

  describe("edge cases and robustness", () => {
    it("empty filter set → formatFilters returns empty string", () => {
      expect(formatFilters({})).toBe("");
    });

    it("formatFilters renders combined filters in stable order", () => {
      const filters: QueryFilters = {
        date_range: "this_quarter",
        region: "EU",
        team: "engineering",
        environment: "production",
        severity: "high",
      };
      // Order is fixed by formatFilters (date_range, region, team, env, severity).
      expect(formatFilters(filters)).toBe(
        " (period: this_quarter, region: EU, team: engineering, env: production, severity: high)",
      );
    });

    it("unknown filter keys in formatFilters are silently ignored (no crash)", () => {
      const filters: QueryFilters = {
        region: "EU",
        // Unknown — should not appear in output but must not throw.
        weather: "sunny",
      };
      expect(formatFilters(filters)).toBe(" (region: EU)");
    });

    it("malformed input — bare 'run' — never throws and yields no custom filters", () => {
      expect(extractQuerySpecificFilters("run", ["status"])).toEqual({});
      expect(parseFilterFromText("run")).toBeNull();
    });

    it("very long filter values are accepted as-is", () => {
      const longVal = "X".repeat(1000);
      const out = extractQuerySpecificFilters(
        `run order_details status ${longVal}`,
        ["status"],
      );
      expect(out.status).toBe(longVal);
    });

    it("special characters in values (regex meta in keys) do not break parsing", () => {
      // Filter key with regex metacharacters — escapeRegex must protect us.
      const out = extractQuerySpecificFilters("run weird order_id.x=42", [
        "order_id.x",
      ]);
      expect(out["order_id.x"]).toBe("42");
    });

    it("mergeFilters: nlp filters take priority over text filters for shared keys", () => {
      const nlp: QueryFilters = { region: "EU" };
      const text: QueryFilters = { region: "US", environment: "production" };
      const merged = mergeFilters(nlp, text);
      expect(merged).toEqual({ region: "EU", environment: "production" });
    });

    it("mergeFilters: explicit (form) filters override both nlp and text", () => {
      const nlp: QueryFilters = { region: "EU" };
      const text: QueryFilters = { environment: "production" };
      const explicit: QueryFilters = { region: "APAC", date_range: "today" };
      const merged = mergeFilters(nlp, text, explicit);
      expect(merged).toEqual({
        region: "APAC",
        environment: "production",
        date_range: "today",
      });
    });

    it("mergeFilters: tolerates a null text-filter argument", () => {
      const merged = mergeFilters({ region: "EU" }, null);
      expect(merged).toEqual({ region: "EU" });
    });
  });

  // ── 6. Combined filters end-to-end ──────────────────────────────────

  describe("combined filters — multiple types in one utterance", () => {
    it("'show monthly_revenue for this quarter in EU' → both date_range and region", () => {
      const out = parseFilterFromText(
        "show monthly_revenue for this quarter in EU",
      );
      expect(out).toMatchObject({ date_range: "this_quarter", region: "EU" });
    });

    it("union of NLP + text filters produces the combined map (not partial)", () => {
      // NLP gave us region; text adds the quarter.
      const nlp = extractFilters([makeEntity("region", "us")]);
      const text = parseFilterFromText("revenue this quarter");
      const merged = mergeFilters(nlp, text);
      expect(merged).toEqual({ region: "US", date_range: "this_quarter" });
    });

    it("region + team + environment together: parseFilterFromText catches all three when phrased well", () => {
      const out = parseFilterFromText(
        "errors for sales team in production for US",
      );
      expect(out?.region).toBe("US");
      expect(out?.team).toBe("sales");
      expect(out?.environment).toBe("production");
    });

    it("a date_range NLP entity plus a custom-key SQL filter survive merge", () => {
      const nlp = extractFilters([makeEntity("time_period", "this_quarter")]);
      const querySpecific = extractQuerySpecificFilters(
        "run trade_volume status Settled",
        ["status"],
      );
      const merged: QueryFilters = { ...nlp, ...querySpecific };
      expect(merged).toEqual({
        date_range: "this_quarter",
        status: "Settled",
      });
    });
  });

  // ── 7. Logger sanity — warn never fires on the happy path ───────────

  describe("logger contract", () => {
    it("happy-path filter parsing does not emit warnings", async () => {
      const { logger } = await import("@/lib/logger");
      extractFilters([makeEntity("region", "EU")]);
      parseFilterFromText("show me revenue for this quarter in EU");
      extractQuerySpecificFilters("run x status Open", ["status"]);
      mergeFilters({ region: "EU" }, null);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
