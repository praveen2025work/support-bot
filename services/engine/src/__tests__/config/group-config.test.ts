import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import os from "os";

// Drive the runtime CONFIG_DIR (the "persistent volume" in production) to a temp
// dir the test controls. group-config ALSO statically imports the bundled
// src/config/groups.json — that import is the build-time snapshot esbuild inlines
// into dist, exactly like production. This lets us prove reads ignore the runtime
// volume file until the config is explicitly (re)loaded.
const tmpDir = path.join(os.tmpdir(), "group-config-startup-test");
const tmpGroupsPath = path.join(tmpDir, "groups.json");
const originalConfigDir = process.env.CONFIG_DIR;

function makeGroup(name: string) {
  return {
    name,
    description: name,
    sources: [],
    apiBaseUrl: null,
    templates: null,
    corpus: null,
    faq: null,
  };
}

// A volume groups.json containing a group ("salesops") that does NOT exist in
// the bundled snapshot — i.e. one created via the admin UI after the build.
function writeVolumeGroups() {
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(
    tmpGroupsPath,
    JSON.stringify({
      groups: {
        default: makeGroup("Default"),
        salesops: makeGroup("Sales Ops"),
      },
    }),
    "utf-8",
  );
}

function removeVolumeGroups() {
  rmSync(tmpDir, { recursive: true, force: true });
}

beforeEach(() => {
  vi.resetModules();
  process.env.CONFIG_DIR = tmpDir;
  removeVolumeGroups();
});

afterAll(() => {
  removeVolumeGroups();
  process.env.CONFIG_DIR = originalConfigDir;
});

describe("group-config startup loading", () => {
  it("reproduces the bug: reads use the bundled snapshot, not the CONFIG_DIR volume", async () => {
    writeVolumeGroups();
    const { getAllGroupIds } = await import("@/config/group-config");
    // Bundled snapshot has the demo groups but NOT the volume-only "salesops".
    expect(getAllGroupIds()).toContain("finance");
    expect(getAllGroupIds()).not.toContain("salesops");
  });

  it("initGroupConfig() seeds in-memory config from the CONFIG_DIR volume", async () => {
    writeVolumeGroups();
    const { initGroupConfig, getAllGroupIds, getGroupConfig } =
      await import("@/config/group-config");
    initGroupConfig();
    expect(getAllGroupIds()).toContain("salesops");
    expect(getGroupConfig("salesops").name).toBe("Sales Ops");
  });

  it("initGroupConfig() is resilient: missing volume file keeps bundled defaults without throwing", async () => {
    const { initGroupConfig, getAllGroupIds } =
      await import("@/config/group-config");
    expect(() => initGroupConfig()).not.toThrow();
    expect(getAllGroupIds()).toContain("finance");
  });
});
