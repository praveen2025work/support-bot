import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";

const dataDir = path.join(os.tmpdir(), "query-service-registry-test");
const originalDataDir = process.env.DATA_DIR;

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

describe("QueryService.getQueries reads the file registry, not HTTP", () => {
  it("returns the group's file queries and never calls ApiClient.get", async () => {
    const reg = await import("@/core/catalog/query-registry");
    reg.upsertQuery("finance", {
      id: "revenue",
      name: "revenue",
      source: "finance",
      type: "api",
      endpoint: "/revenue",
    } as unknown as import("@/core/api-connector/types").Query);

    const { ApiClient } = await import("@/core/api-connector/api-client");
    const { QueryService } = await import("@/core/api-connector/query-service");
    const client = new ApiClient("http://unused.test/api");
    const getSpy = vi.spyOn(client, "get");

    const service = new QueryService(client, [], [], "finance");
    const queries = await service.getQueries();

    expect(queries.map((q) => q.name)).toEqual(["revenue"]);
    expect(getSpy).not.toHaveBeenCalled();
  });
});
