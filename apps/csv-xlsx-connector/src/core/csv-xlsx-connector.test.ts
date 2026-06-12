import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadFileData, clearParseCache } from "@/core/csv-xlsx-connector";
import type { FileConnectorConfig } from "@/core/types";

let dir: string;

beforeEach(async () => {
  clearParseCache();
  dir = await fs.mkdtemp(join(tmpdir(), "csv-cache-"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

function makeConfig(fileName: string): FileConnectorConfig {
  const now = new Date().toISOString();
  // Use fileBaseDir + basename so resolveFilePath joins them and finds the
  // file under the temp dir (it does not special-case absolute filePath).
  return {
    id: "c1",
    name: "test",
    type: "csv",
    filePath: fileName,
    fileBaseDir: dir,
    source: "default",
    description: "",
    createdAt: now,
    updatedAt: now,
  };
}

test("second execute over an unchanged file is served from cache (no re-parse)", async () => {
  const file = join(dir, "data.csv");
  await fs.writeFile(file, "id,name\n1,alice\n2,bob\n");
  // Pin mtime to a whole-second value so it survives a utimes round-trip
  // without sub-millisecond precision loss (which the filesystem would
  // otherwise truncate, falsely invalidating the cache key in this test).
  const fixed = new Date(1_700_000_000_000);
  await fs.utimes(file, fixed, fixed);
  const config = makeConfig("data.csv");

  const first = await loadFileData(config);
  assert.equal(first.rows.length, 2);
  assert.equal(first.rows[0].name, "alice");

  // Rewrite the contents but restore the SAME size + mtime. The cache key
  // (path + mtime + size) is therefore unchanged, so a correct cache must
  // return the OLD parse — proving it did not re-read or re-parse from disk.
  const stat = await fs.stat(file);
  const header = "id,name\n";
  const filler = "x".repeat(Number(stat.size) - header.length);
  await fs.writeFile(file, header + filler);
  await fs.utimes(file, fixed, fixed);
  const restat = await fs.stat(file);
  assert.equal(restat.size, stat.size, "test setup: size must be unchanged");
  assert.equal(
    restat.mtimeMs,
    stat.mtimeMs,
    "test setup: mtime must be unchanged",
  );

  const second = await loadFileData(config);
  // Cached parse wins: still the original rows, not the rewritten content.
  assert.equal(second.rows[0].name, "alice");
  assert.equal(second.rows[1].name, "bob");
});

test("cache invalidates when the file size changes", async () => {
  const file = join(dir, "data.csv");
  await fs.writeFile(file, "id,name\n1,alice\n");
  const config = makeConfig("data.csv");

  const first = await loadFileData(config);
  assert.equal(first.rows.length, 1);

  // Append a row → size changes → cache must invalidate and re-parse.
  await fs.writeFile(file, "id,name\n1,alice\n2,bob\n3,carol\n");
  const second = await loadFileData(config);
  assert.equal(second.rows.length, 3);
  assert.equal(second.rows[2].name, "carol");
});

test("cache invalidates when mtime changes (same size)", async () => {
  const file = join(dir, "data.csv");
  await fs.writeFile(file, "id,name\n1,alice\n2,bobby\n");
  const config = makeConfig("data.csv");

  const first = await loadFileData(config);
  assert.equal(first.rows[1].name, "bobby");

  // Rewrite with same byte length but a newer mtime → must re-parse.
  await fs.writeFile(file, "id,name\n1,alice\n2,carol\n");
  const future = new Date(Date.now() + 5000);
  await fs.utimes(file, future, future);

  const second = await loadFileData(config);
  assert.equal(second.rows[1].name, "carol");
});
