import { logger } from "@/lib/logger";
import { runCalibration, shouldAlertDrift } from "@/core/nlp/calibration";
import type { CalibrationRecord } from "@/core/nlp/calibration";
import {
  appendCalibrationRecord,
  getLatestTwo,
} from "@/core/nlp/calibration-history";

const DEFAULT_INTERVAL_MS = 86_400_000; // 24h
const DEFAULT_DRIFT_THRESHOLD = 2;

let intervalHandle: NodeJS.Timeout | null = null;
let running = false;

async function sendDriftAlert(
  drift: number,
  latest: CalibrationRecord,
  previous: CalibrationRecord,
): Promise<void> {
  logger.warn(
    {
      drift,
      latest: latest.current.compositeScore,
      previous: previous.current.compositeScore,
    },
    "NLP calibration drift exceeded threshold",
  );
  const webhook = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `:warning: NLP calibration drift ${drift.toFixed(2)} (composite ${previous.current.compositeScore.toFixed(2)} → ${latest.current.compositeScore.toFixed(2)})`,
      }),
    });
  } catch (err) {
    logger.error({ err }, "Failed to post calibration drift alert");
  }
}

/** Run one calibration, persist it, and alert on drift. Never throws. */
export async function runCalibrationTick(): Promise<void> {
  if (running) {
    logger.warn("Calibration already running — skipping tick");
    return;
  }
  running = true;
  try {
    const record = await runCalibration();
    await appendCalibrationRecord(record);
    const { latest, previous } = await getLatestTwo();
    if (latest && previous) {
      const threshold =
        Number(process.env.CALIBRATION_DRIFT_THRESHOLD) ||
        DEFAULT_DRIFT_THRESHOLD;
      const { alert, drift } = shouldAlertDrift(latest, previous, threshold);
      if (alert) await sendDriftAlert(drift, latest, previous);
    }
  } catch (err) {
    logger.error({ err }, "Calibration tick failed");
  } finally {
    running = false;
  }
}

/**
 * Start the periodic calibration runner. Off unless CALIBRATION_ENABLED=true
 * (the NLP boot per run is heavy, so dev/CI shouldn't pay it). The first run is
 * deferred a full interval rather than firing on boot.
 */
export function startCalibrationScheduler(): void {
  if (process.env.CALIBRATION_ENABLED !== "true") return;
  if (intervalHandle) return;
  const interval =
    Number(process.env.CALIBRATION_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
  logger.info({ intervalMs: interval }, "Calibration scheduler started");
  intervalHandle = setInterval(() => {
    void runCalibrationTick();
  }, interval);
  if (typeof intervalHandle.unref === "function") intervalHandle.unref();
}

export function stopCalibrationScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
