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

  it("saveQuery assigns a fresh q<N> id to a new query", async () => {
    const reg = await import("@/core/catalog/query-registry");
    const q = reg.saveQuery("finance", {
      name: "revenue",
      source: "finance",
      type: "api",
      endpoint: "/revenue",
    });
    expect(q.id).toBe("q1");
    expect(reg.getGroupQueries("finance").map((x) => x.name)).toEqual([
      "revenue",
    ]);
  });

  it("saveQuery increments ids for new names and upserts by name (preserving id)", async () => {
    const reg = await import("@/core/catalog/query-registry");
    reg.saveQuery("finance", {
      name: "revenue",
      source: "finance",
      type: "api",
      endpoint: "/revenue",
    });
    const second = reg.saveQuery("finance", {
      name: "costs",
      source: "finance",
      type: "api",
      endpoint: "/costs",
    });
    expect(second.id).toBe("q2");
    // same name -> upsert: keeps id "q1", updates the field, no new row
    const upd = reg.saveQuery("finance", {
      name: "revenue",
      description: "Total revenue",
      type: "api",
      endpoint: "/revenue",
    });
    expect(upd.id).toBe("q1");
    expect(upd.description).toBe("Total revenue");
    expect(reg.getGroupQueries("finance")).toHaveLength(2);
  });

  it("updateGroupQuery updates by id and returns null for an unknown id", async () => {
    const reg = await import("@/core/catalog/query-registry");
    const created = reg.saveQuery("finance", {
      name: "revenue",
      source: "finance",
      type: "api",
      endpoint: "/revenue",
    });
    const updated = reg.updateGroupQuery("finance", created.id, {
      description: "x",
    });
    expect(updated?.description).toBe("x");
    expect(
      reg.updateGroupQuery("finance", "does-not-exist", { description: "y" }),
    ).toBeNull();
  });

  it("getAllQueries merges queries across configured groups with a groupId", async () => {
    const reg = await import("@/core/catalog/query-registry");
    // "default" is always a configured group (bundled groups.json)
    reg.saveQuery("default", {
      name: "revenue",
      source: "finance",
      type: "api",
      endpoint: "/revenue",
    });
    const mine = reg.getAllQueries().find((q) => q.name === "revenue");
    expect(mine?.groupId).toBe("default");
  });

  it("save/get works with no db.json anywhere (file-based, env-agnostic)", async () => {
    const reg = await import("@/core/catalog/query-registry");
    expect(() =>
      reg.saveQuery("default", {
        name: "q",
        source: "s",
        type: "api",
        endpoint: "/q",
      }),
    ).not.toThrow();
  });
});
