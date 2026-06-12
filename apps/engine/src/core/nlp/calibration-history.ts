import { promises as fsp } from "fs";
import { dirname } from "path";
import { paths } from "@/lib/env-config";
import type { CalibrationRecord } from "./calibration";

// Append-only JSONL history of calibration runs, under apps/engine/data/nlp/.

export async function appendCalibrationRecord(
  rec: CalibrationRecord,
): Promise<void> {
  const file = paths.data.calibrationHistory;
  await fsp.mkdir(dirname(file), { recursive: true });
  await fsp.appendFile(file, JSON.stringify(rec) + "\n", "utf-8");
}

export async function readCalibrationHistory(
  limit?: number,
): Promise<CalibrationRecord[]> {
  const file = paths.data.calibrationHistory;
  try {
    const content = (await fsp.readFile(file, "utf-8")).trim();
    if (!content) return [];
    const records = content
      .split("\n")
      .map((line) => {
        try {
          return JSON.parse(line) as CalibrationRecord;
        } catch {
          return null;
        }
      })
      .filter((r): r is CalibrationRecord => r !== null)
      .reverse(); // newest first
    return limit ? records.slice(0, limit) : records;
  } catch {
    return [];
  }
}

export async function getLatestTwo(): Promise<{
  latest?: CalibrationRecord;
  previous?: CalibrationRecord;
}> {
  const recent = await readCalibrationHistory(2);
  return { latest: recent[0], previous: recent[1] };
}
