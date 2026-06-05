import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync, utimesSync } from "fs";
import path from "path";
import os from "os";

// Drive the runtime CONFIG_DIR (the "persistent volume" in production) to a temp
// dir the test controls. group-config ALSO statically imports the bundled
// src/config/groups.json — that import is the build-time snapshot esbuild inlines
// into dist, exactly like production. These tests prove that reads now reflect
// the runtime volume file (loaded at startup AND re-read on mtime change), so
// edits made by any instance on shared storage show up without a restart.
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

// Write a volume groups.json with the given group ids (none of which exist in
// the bundled snapshot — i.e. created via the admin UI after the build).
function writeVolumeGroups(...names: string[]) {
  mkdirSync(tmpDir, { recursive: true });
  const groups: Record<string, ReturnType<typeof makeGroup>> = {
    default: makeGroup("Default"),
  };
  for (const n of names) groups[n] = makeGroup(n);
  writeFileSync(tmpGroupsPath, JSON.stringify({ groups }), "utf-8");
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

describe("group-config volume loading", () => {
  it("reads reflect the CONFIG_DIR volume on first read (mtime auto-load, no init needed)", async () => {
    writeVolumeGroups("salesops");
    const { getAllGroupIds } = await import("@/config/group-config");
    // The first read picks up the volume file even without initGroupConfig.
    expect(getAllGroupIds()).toContain("salesops");
    // ...and it reflects the volume, not the bundled snapshot.
    expect(getAllGroupIds()).not.toContain("finance");
  });

  it("picks up a change made by another instance without a restart (mtime reload)", async () => {
    writeVolumeGroups("salesops");
    const { getAllGroupIds } = await import("@/config/group-config");
    expect(getAllGroupIds()).toContain("salesops");
    expect(getAllGroupIds()).not.toContain("marketing");

    // Another instance (or admin) adds a group to the shared file.
    writeVolumeGroups("salesops", "marketing");
    // Force a strictly-later mtime so the change is detectable regardless of
    // filesystem timestamp granularity.
    utimesSync(tmpGroupsPath, new Date(), new Date(Date.now() + 1000));

    // Next read reflects it — no reloadGroupConfig()/initGroupConfig() call.
    expect(getAllGroupIds()).toContain("marketing");
    expect(getAllGroupIds()).toContain("salesops");
  });

  it("initGroupConfig() eagerly seeds in-memory config from the CONFIG_DIR volume", async () => {
    writeVolumeGroups("salesops");
    const { initGroupConfig, getAllGroupIds, getGroupConfig } =
      await import("@/config/group-config");
    initGroupConfig();
    expect(getAllGroupIds()).toContain("salesops");
    expect(getGroupConfig("salesops").name).toBe("salesops");
  });

  it("resilient: a missing volume file keeps the bundled defaults without throwing", async () => {
    const { initGroupConfig, getAllGroupIds } =
      await import("@/config/group-config");
    expect(() => initGroupConfig()).not.toThrow();
    // No volume file → reads fall back to the bundled snapshot.
    expect(getAllGroupIds()).toContain("finance");
  });
});
