import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fsp, writeFileSync, mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";

// Use a temp dir as DATA_DIR so we never touch real data files.
let tempDir: string;

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/env-config", () => ({
  paths: {
    data: {
      synonymsFile: (groupId: string) =>
        path.join(tempDir, "learning", groupId, "synonyms.json"),
    },
  },
}));

// Import after mocks. Use dynamic import inside each test to get a fresh
// module instance per scenario where the cache is the thing under test.
async function importExpander() {
  return await import("../../../core/nlp/synonym-expander");
}

function writeGroupSynonyms(groupId: string, contents: unknown): void {
  const dir = path.join(tempDir, "learning", groupId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "synonyms.json"),
    JSON.stringify(contents),
    "utf-8",
  );
}

describe("synonym-expander", () => {
  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `synonym-expander-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fsp.mkdir(tempDir, { recursive: true });
    // Reset modules so the per-group cache starts empty for every test.
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("default (no group) behaviour preserved", () => {
    it("returns built-in synonyms for a known canonical term", async () => {
      const { getSynonyms } = await importExpander();
      const syns = getSynonyms("revenue");
      expect(syns.has("income")).toBe(true);
      expect(syns.has("sales")).toBe(true);
    });

    it("returns empty set for unknown terms", async () => {
      const { getSynonyms } = await importExpander();
      const syns = getSynonyms("nonexistentword123");
      expect(syns.size).toBe(0);
    });

    it("expandWithSynonyms includes alternates from default groups", async () => {
      const { expandWithSynonyms } = await importExpander();
      const out = expandWithSynonyms("show me revenue");
      expect(out).toContain("revenue");
      expect(out).toContain("income");
    });
  });

  describe("per-group: file present", () => {
    it("merges per-group synonyms with the default set", async () => {
      writeGroupSynonyms("finance", [
        {
          canonical: "revenue",
          synonyms: ["top line", "topline", "gross sales"],
          updatedAt: new Date().toISOString(),
          updatedBy: "admin",
        },
      ]);
      const { getSynonyms } = await importExpander();
      const syns = getSynonyms("revenue", "finance");
      // Default synonyms still present
      expect(syns.has("income")).toBe(true);
      // Plus the per-group additions (lowercased)
      expect(syns.has("topline")).toBe(true);
      expect(syns.has("gross sales")).toBe(true);
    });

    it("registers the canonical term itself as a lookup key", async () => {
      writeGroupSynonyms("hr_team", [
        {
          canonical: "kuberntes_typo_canonical",
          synonyms: ["k8s", "kube"],
          updatedAt: new Date().toISOString(),
        },
      ]);
      const { getSynonyms } = await importExpander();
      const syns = getSynonyms("kuberntes_typo_canonical", "hr_team");
      expect(syns.has("k8s")).toBe(true);
      expect(syns.has("kube")).toBe(true);
    });

    it("expandWithSynonyms picks up per-group entries", async () => {
      writeGroupSynonyms("finance", [
        {
          canonical: "headcount",
          synonyms: ["staffing", "fte_count"],
          updatedAt: new Date().toISOString(),
        },
      ]);
      const { expandWithSynonyms } = await importExpander();
      const out = expandWithSynonyms("show me headcount", "finance");
      expect(out).toContain("staffing");
      expect(out).toContain("fte_count");
    });

    it("does not bleed group A synonyms into group B", async () => {
      writeGroupSynonyms("group_a", [
        {
          canonical: "alpha",
          synonyms: ["only_in_a"],
          updatedAt: new Date().toISOString(),
        },
      ]);
      const { getSynonyms } = await importExpander();
      const inA = getSynonyms("alpha", "group_a");
      const inB = getSynonyms("alpha", "group_b");
      expect(inA.has("only_in_a")).toBe(true);
      expect(inB.has("only_in_a")).toBe(false);
    });
  });

  describe("per-group: file missing", () => {
    it("falls back to defaults silently when file absent", async () => {
      const { getSynonyms } = await importExpander();
      // No file written for this groupId
      const syns = getSynonyms("revenue", "missing-group");
      // Defaults still present
      expect(syns.has("income")).toBe(true);
      // No new keys leaked
      expect(syns.has("only_in_a")).toBe(false);
    });
  });

  describe("per-group: file malformed", () => {
    it("logs a warning and returns defaults when JSON is invalid", async () => {
      const dir = path.join(tempDir, "learning", "broken");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, "synonyms.json"),
        "{ this is not valid json",
        "utf-8",
      );
      const { logger } = await import("@/lib/logger");
      const { getSynonyms } = await importExpander();
      const syns = getSynonyms("revenue", "broken");
      expect(syns.has("income")).toBe(true);
      expect(logger.warn).toHaveBeenCalled();
    });

    it("ignores entries with the wrong shape but accepts valid siblings", async () => {
      writeGroupSynonyms("mixed", [
        { canonical: "good", synonyms: ["g1"], updatedAt: "2026-05-09" },
        // missing updatedAt
        { canonical: "bad", synonyms: ["b1"] },
        // synonyms not array
        { canonical: "weird", synonyms: "nope", updatedAt: "2026-05-09" },
      ]);
      const { logger } = await import("@/lib/logger");
      const { getSynonyms } = await importExpander();
      expect(getSynonyms("good", "mixed").has("g1")).toBe(true);
      expect(getSynonyms("bad", "mixed").size).toBe(0);
      expect(getSynonyms("weird", "mixed").size).toBe(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    it("returns defaults if the top level is not an array", async () => {
      writeGroupSynonyms("notarray", { canonical: "x", synonyms: ["y"] });
      const { logger } = await import("@/lib/logger");
      const { getSynonyms } = await importExpander();
      const syns = getSynonyms("revenue", "notarray");
      expect(syns.has("income")).toBe(true);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe("clearGroupSynonymsCache", () => {
    it("makes a subsequent call re-read the file", async () => {
      writeGroupSynonyms("dynamic", [
        {
          canonical: "term",
          synonyms: ["v1"],
          updatedAt: new Date().toISOString(),
        },
      ]);
      const { getSynonyms, clearGroupSynonymsCache } = await importExpander();
      expect(getSynonyms("term", "dynamic").has("v1")).toBe(true);

      // Update the file on disk
      writeGroupSynonyms("dynamic", [
        {
          canonical: "term",
          synonyms: ["v2"],
          updatedAt: new Date().toISOString(),
        },
      ]);
      // Without invalidation, the cached map is still v1
      expect(getSynonyms("term", "dynamic").has("v1")).toBe(true);
      expect(getSynonyms("term", "dynamic").has("v2")).toBe(false);

      // Clear the cache and we should see v2
      clearGroupSynonymsCache("dynamic");
      expect(getSynonyms("term", "dynamic").has("v2")).toBe(true);
    });
  });
});
