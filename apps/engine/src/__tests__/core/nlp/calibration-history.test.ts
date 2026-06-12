import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fsp } from "fs";
import path from "path";
import os from "os";

const { ref } = vi.hoisted(() => ({ ref: { file: "" } }));
vi.mock("@/lib/env-config", () => ({
  paths: {
    data: {
      get calibrationHistory() {
        return ref.file;
      },
    },
  },
}));

import {
  appendCalibrationRecord,
  readCalibrationHistory,
  getLatestTwo,
} from "@/core/nlp/calibration-history";
import type { CalibrationRecord } from "@/core/nlp/calibration";

function rec(score: number, ts: string): CalibrationRecord {
  return {
    timestamp: ts,
    testSetSize: 1,
    testSetHash: "h1",
    best: { weights: "w", threshold: 0.5, score },
    current: {
      weights: "w",
      threshold: 0.5,
      correctConfident: 0,
      wrongConfident: 0,
      oodFalseConfident: 0,
      posTotal: 0,
      oodTotal: 0,
      compositeScore: score,
    },
  };
}

beforeEach(() => {
  ref.file = path.join(
    os.tmpdir(),
    `calib-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    "history.jsonl",
  );
});

afterEach(async () => {
  await fsp.rm(path.dirname(ref.file), { recursive: true, force: true });
});

describe("calibration history", () => {
  it("returns [] when no history file exists", async () => {
    expect(await readCalibrationHistory()).toEqual([]);
    const { latest, previous } = await getLatestTwo();
    expect(latest).toBeUndefined();
    expect(previous).toBeUndefined();
  });

  it("round-trips records newest-first", async () => {
    await appendCalibrationRecord(rec(1, "2026-06-12T00:00:00.000Z"));
    await appendCalibrationRecord(rec(2, "2026-06-12T01:00:00.000Z"));
    const all = await readCalibrationHistory();
    expect(all).toHaveLength(2);
    expect(all[0].current.compositeScore).toBe(2); // newest first
    expect(all[1].current.compositeScore).toBe(1);
  });

  it("getLatestTwo returns latest + previous in order", async () => {
    await appendCalibrationRecord(rec(1, "2026-06-12T00:00:00.000Z"));
    await appendCalibrationRecord(rec(2, "2026-06-12T01:00:00.000Z"));
    await appendCalibrationRecord(rec(3, "2026-06-12T02:00:00.000Z"));
    const { latest, previous } = await getLatestTwo();
    expect(latest?.current.compositeScore).toBe(3);
    expect(previous?.current.compositeScore).toBe(2);
  });

  it("respects the limit argument", async () => {
    await appendCalibrationRecord(rec(1, "2026-06-12T00:00:00.000Z"));
    await appendCalibrationRecord(rec(2, "2026-06-12T01:00:00.000Z"));
    expect(await readCalibrationHistory(1)).toHaveLength(1);
  });
});
