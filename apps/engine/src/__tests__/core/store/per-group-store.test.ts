import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync, utimesSync } from "fs";
import path from "path";
import os from "os";
import { z } from "zod";
import { PerGroupStore } from "@/core/store/per-group-store";

const dir = path.join(os.tmpdir(), "per-group-store-test");
const Schema = z.object({ items: z.array(z.string()) });

function makeStore() {
  return new PerGroupStore({
    dir,
    fileFor: (g: string) => path.join(dir, `${g}.json`),
    schema: Schema,
    defaultValue: () => ({ items: [] }),
  });
}

beforeEach(() => {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("PerGroupStore", () => {
  it("returns defaultValue when the file is missing", () => {
    expect(makeStore().read("nope")).toEqual({ items: [] });
  });

  it("reads and validates an existing file", () => {
    writeFileSync(path.join(dir, "g.json"), JSON.stringify({ items: ["a"] }));
    expect(makeStore().read("g")).toEqual({ items: ["a"] });
  });

  it("write is atomic and round-trips, and read returns it", () => {
    const store = makeStore();
    store.write("g", { items: ["x", "y"] });
    expect(makeStore().read("g")).toEqual({ items: ["x", "y"] });
  });

  it("caches by mtime: does not re-parse when the file is unchanged", () => {
    const store = makeStore();
    writeFileSync(path.join(dir, "g.json"), JSON.stringify({ items: ["a"] }));
    expect(store.read("g")).toEqual({ items: ["a"] });
    const spy = vi.spyOn(JSON, "parse");
    store.read("g");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("reloads when mtime changes (another instance wrote)", () => {
    const store = makeStore();
    const file = path.join(dir, "g.json");
    writeFileSync(file, JSON.stringify({ items: ["a"] }));
    expect(store.read("g")).toEqual({ items: ["a"] });
    writeFileSync(file, JSON.stringify({ items: ["a", "b"] }));
    utimesSync(file, new Date(), new Date(Date.now() + 1000));
    expect(store.read("g")).toEqual({ items: ["a", "b"] });
  });

  it("corrupt file returns last-good cache without throwing", () => {
    const store = makeStore();
    const file = path.join(dir, "g.json");
    writeFileSync(file, JSON.stringify({ items: ["a"] }));
    expect(store.read("g")).toEqual({ items: ["a"] });
    writeFileSync(file, "{ not json");
    utimesSync(file, new Date(), new Date(Date.now() + 1000));
    expect(() => store.read("g")).not.toThrow();
    expect(store.read("g")).toEqual({ items: ["a"] });
  });

  it("list() returns group ids that have files", () => {
    const store = makeStore();
    store.write("a", { items: [] });
    store.write("b", { items: [] });
    expect(store.list().sort()).toEqual(["a", "b"]);
  });
});
