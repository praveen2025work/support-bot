import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync, utimesSync } from "fs";
import path from "path";
import os from "os";

// Drive CONFIG_DIR (the "shared volume" in production) to a temp dir. The loader
// also statically imports the bundled filter-config.json as a fallback. These
// tests prove reads reflect the runtime file and re-read on mtime change, so an
// admin edit on one instance propagates to others on the next read (no restart).
const tmpDir = path.join(os.tmpdir(), "filter-config-loader-test");
const tmpFile = path.join(tmpDir, "filter-config.json");
const originalConfigDir = process.env.CONFIG_DIR;

function writeConfig(dateFormat: string) {
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(
    tmpFile,
    JSON.stringify({ filters: { date_range: { dateFormat } } }),
    "utf-8",
  );
}

beforeEach(() => {
  vi.resetModules();
  process.env.CONFIG_DIR = tmpDir;
  rmSync(tmpDir, { recursive: true, force: true });
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  process.env.CONFIG_DIR = originalConfigDir;
});

describe("filter-config loader", () => {
  it("reads the CONFIG_DIR file", async () => {
    writeConfig("DD/MM/YYYY");
    const { getFilterConfig } = await import("@/config/filter-config-loader");
    const filters = getFilterConfig().filters as Record<
      string,
      Record<string, unknown>
    >;
    expect(filters.date_range.dateFormat).toBe("DD/MM/YYYY");
  });

  it("re-reads when the file changes (mtime), no restart", async () => {
    writeConfig("DD/MM/YYYY");
    const { getFilterConfig } = await import("@/config/filter-config-loader");
    expect(
      (getFilterConfig().filters as Record<string, Record<string, unknown>>)
        .date_range.dateFormat,
    ).toBe("DD/MM/YYYY");

    writeConfig("YYYY.MM.DD");
    utimesSync(tmpFile, new Date(), new Date(Date.now() + 1000));

    expect(
      (getFilterConfig().filters as Record<string, Record<string, unknown>>)
        .date_range.dateFormat,
    ).toBe("YYYY.MM.DD");
  });

  it("falls back to the bundled config when the runtime file is missing", async () => {
    const { getFilterConfig } = await import("@/config/filter-config-loader");
    // No file written → bundled snapshot; it still has a `filters` object.
    expect(getFilterConfig().filters).toBeTypeOf("object");
  });
});
