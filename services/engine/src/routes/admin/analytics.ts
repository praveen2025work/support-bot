/**
 * Per-group analytics derived from the learning interactions log.
 *
 * Today the engine writes one JSONL line per chat turn to
 * `services/engine/data/learning/<groupId>/interactions.jsonl`. This route
 * aggregates that stream into the views the admin UI needs to see *where
 * users are getting stuck* and *which queries deserve a retrained
 * utterance set*.
 *
 * Inputs:
 *   GET /api/admin/analytics/nlp-misses?groupId=<id>&since=<ISO>&limit=<n>
 *
 * Output:
 *   {
 *     groupId, sinceIso, totalInteractions, missCount, missRate,
 *     intentDistribution: [{ intent, count, pct }],
 *     confidenceDistribution: [{ bucket, count }],
 *     topMissedUtterances: [{ normalizedText, count, samples: string[],
 *                             lastSeen }],
 *     retryRate
 *   }
 *
 * "Miss" = NLP confidence < NLP_DISAMBIG_FLOOR or intent === "None" or
 *          intent.startsWith("disambiguation.no_match"). These are the
 *          interactions the user almost certainly typed again, which
 *          translates into ticket volume for support teams.
 *
 * Auth: requires `learning.manage` — same bar as the existing learning
 * review queue, since the data is the same JSONL.
 */

import { Router, Request, Response } from "express";
import { promises as fsPromises } from "fs";
import { logger } from "@/lib/logger";
import { paths } from "@/lib/env-config";
import { requirePermission } from "@/middleware/rbac";
import { NLP_DISAMBIG_FLOOR } from "@/core/constants";
import type { InteractionLog } from "@/core/learning/types";

const router = Router();

const MAX_SAMPLES_PER_UTTERANCE = 3;
const DEFAULT_TOP_N = 20;
const RETRY_WINDOW_MS = 30_000;

interface MissedUtterance {
  normalizedText: string;
  count: number;
  samples: string[];
  lastSeen: string;
  topDetectedIntent: string;
  avgConfidence: number;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"`]/g, "")
    .replace(/\s+/g, " ");
}

function isMiss(log: InteractionLog): boolean {
  if (!log.intent || log.intent === "None") return true;
  if (log.intent.startsWith("disambiguation.no_match")) return true;
  if (typeof log.confidence === "number" && log.confidence < NLP_DISAMBIG_FLOOR)
    return true;
  return false;
}

async function readInteractions(
  groupId: string,
  sinceIso: string | null,
): Promise<InteractionLog[]> {
  const path = paths.data.interactions(groupId);
  let raw: string;
  try {
    raw = await fsPromises.readFile(path, "utf-8");
  } catch {
    return [];
  }
  const out: InteractionLog[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const log = JSON.parse(trimmed) as InteractionLog;
      if (sinceIso && log.timestamp < sinceIso) continue;
      out.push(log);
    } catch {
      // Skip malformed JSON lines silently.
    }
  }
  return out;
}

router.get(
  "/nlp-misses",
  requirePermission("learning.manage"),
  async (req: Request, res: Response) => {
    const groupId = (req.query.groupId as string) || "default";
    const sinceIso = (req.query.since as string) || null;
    const limit = parseInt(req.query.limit as string, 10) || DEFAULT_TOP_N;

    try {
      const logs = await readInteractions(groupId, sinceIso);
      const total = logs.length;
      const missLogs = logs.filter(isMiss);
      const missCount = missLogs.length;
      const missRate = total > 0 ? missCount / total : 0;

      // Intent distribution across ALL interactions (not just misses) so
      // the operator sees what's getting answered too.
      const intentCounts = new Map<string, number>();
      for (const log of logs) {
        intentCounts.set(log.intent, (intentCounts.get(log.intent) || 0) + 1);
      }
      const intentDistribution = Array.from(intentCounts.entries())
        .map(([intent, count]) => ({
          intent,
          count,
          pct: total > 0 ? count / total : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Confidence histogram in 0.1 buckets (skip 1.0 since pattern/fuzzy
      // saturate at 1.0 and would dominate).
      const buckets: Record<string, number> = {
        "0.0-0.2": 0,
        "0.2-0.4": 0,
        "0.4-0.6": 0,
        "0.6-0.8": 0,
        "0.8-1.0": 0,
      };
      for (const log of logs) {
        const c = log.confidence ?? 0;
        if (c < 0.2) buckets["0.0-0.2"] += 1;
        else if (c < 0.4) buckets["0.2-0.4"] += 1;
        else if (c < 0.6) buckets["0.4-0.6"] += 1;
        else if (c < 0.8) buckets["0.6-0.8"] += 1;
        else buckets["0.8-1.0"] += 1;
      }
      const confidenceDistribution = Object.entries(buckets).map(
        ([bucket, count]) => ({ bucket, count }),
      );

      // Top missed utterances — normalize and aggregate, attach a few
      // real samples so the admin can see context, plus the detected
      // intent (probably wrong but informative).
      const missGroups = new Map<
        string,
        {
          count: number;
          samples: string[];
          lastSeen: string;
          intentCounts: Map<string, number>;
          confSum: number;
        }
      >();
      for (const log of missLogs) {
        const key = normalize(log.userMessage);
        if (!key) continue;
        let entry = missGroups.get(key);
        if (!entry) {
          entry = {
            count: 0,
            samples: [],
            lastSeen: log.timestamp,
            intentCounts: new Map(),
            confSum: 0,
          };
          missGroups.set(key, entry);
        }
        entry.count += 1;
        entry.confSum += log.confidence || 0;
        if (entry.samples.length < MAX_SAMPLES_PER_UTTERANCE) {
          entry.samples.push(log.userMessage);
        }
        if (log.timestamp > entry.lastSeen) entry.lastSeen = log.timestamp;
        entry.intentCounts.set(
          log.intent,
          (entry.intentCounts.get(log.intent) || 0) + 1,
        );
      }
      const topMissedUtterances: MissedUtterance[] = Array.from(
        missGroups.entries(),
      )
        .map(([normalizedText, e]) => {
          let topIntent = "None";
          let topIntentCount = 0;
          for (const [intent, count] of e.intentCounts) {
            if (count > topIntentCount) {
              topIntentCount = count;
              topIntent = intent;
            }
          }
          return {
            normalizedText,
            count: e.count,
            samples: e.samples,
            lastSeen: e.lastSeen,
            topDetectedIntent: topIntent,
            avgConfidence: e.count > 0 ? e.confSum / e.count : 0,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      // Retry rate — % of interactions where the SAME session asked again
      // within RETRY_WINDOW_MS. Proxy for "user got an answer they
      // didn't accept and immediately rephrased."
      const bySession = new Map<string, InteractionLog[]>();
      for (const log of logs) {
        const list = bySession.get(log.sessionId) || [];
        list.push(log);
        bySession.set(log.sessionId, list);
      }
      let retries = 0;
      for (const sessionLogs of bySession.values()) {
        const sorted = [...sessionLogs].sort((a, b) =>
          a.timestamp.localeCompare(b.timestamp),
        );
        for (let i = 1; i < sorted.length; i++) {
          const prevT = new Date(sorted[i - 1].timestamp).getTime();
          const curT = new Date(sorted[i].timestamp).getTime();
          if (curT - prevT <= RETRY_WINDOW_MS) retries += 1;
        }
      }
      const retryRate = total > 0 ? retries / total : 0;

      return res.json({
        groupId,
        sinceIso,
        totalInteractions: total,
        missCount,
        missRate,
        intentDistribution,
        confidenceDistribution,
        topMissedUtterances,
        retryRate,
        thresholds: {
          disambigFloor: NLP_DISAMBIG_FLOOR,
          retryWindowMs: RETRY_WINDOW_MS,
        },
      });
    } catch (err) {
      logger.error(
        { err, groupId, sinceIso },
        "analytics route: failed to compute NLP-miss aggregates",
      );
      return res
        .status(500)
        .json({ error: "Failed to compute NLP-miss analytics" });
    }
  },
);

export default router;
