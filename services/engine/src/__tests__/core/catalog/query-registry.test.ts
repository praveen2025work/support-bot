import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";
import type { Query } from "@/core/api-connector/types";

const dataDir = path.join(os.tmpdir(), "query-registry-test");
const originalDataDir = process.env.DATA_DIR;

function makeApiQuery(name: string, source: string): Query {
  return {
    id: name,
    name,
    source,
    type: "api",
    endpoint: `/${name}`,
  } as unknown as Query;
}

beforeEach(() => {
  vi.resetModules();
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  process.env.DATA_DIR = dataDir;
});
afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
  process.env.DATA_DIR = originalDataDir;
});

describe("query-registry", () => {
  it("getGroupQueries returns empty for a group with no file", async () => {
    const reg = await import("@/core/catalog/query-registry");
    expect(reg.getGroupQueries("finance")).toEqual([]);
  });

  it("upsertQuery then getGroupQueries round-trips", async () => {
    const reg = await import("@/core/catalog/query-registry");
    reg.upsertQuery("finance", makeApiQuery("revenue", "finance"));
    const names = reg.getGroupQueries("finance").map((q) => q.name);
    expect(names).toEqual(["revenue"]);
  });

  it("deleteQuery removes by id", async () => {
    const reg = await import("@/core/catalog/query-registry");
    reg.upsertQuery("finance", makeApiQuery("revenue", "finance"));
    expect(reg.deleteQuery("finance", "revenue")).toBe(true);
    expect(reg.getGroupQueries("finance")).toEqual([]);
  });

  it("rebuildAllGroupFiles uses the allowlist when group.queries is set", async () => {
    const reg = await import("@/core/catalog/query-registry");
    const allQueries = [
      makeApiQuery("revenue", "finance"),
      makeApiQuery("trades", "trading"),
      makeApiQuery("errors", "engineering"),
    ];
    const groups = {
      finance: { sources: ["finance", "trading"], queries: ["revenue"] },
      engineering: { sources: ["engineering"], queries: [] },
    };
    reg.rebuildAllGroupFiles(allQueries, groups);
    // finance: allowlist -> only "revenue" (NOT trades, even though source matches)
    expect(reg.getGroupQueries("finance").map((q) => q.name)).toEqual([
      "revenue",
    ]);
    // engineering: no allowlist -> source match -> "errors"
    expect(reg.getGroupQueries("engineering").map((q) => q.name)).toEqual([
      "errors",
    ]);
  });
});
