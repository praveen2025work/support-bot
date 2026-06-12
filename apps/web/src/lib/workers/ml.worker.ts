/**
 * lib/workers/ml.worker.ts
 * Web Worker — runs all ML operations off the main thread
 * Prevents UI freeze on large CSV files (10k+ rows)
 *
 * Gap L fix: added regression, histogram, and forecast cases
 */

import { profileDataset } from "../ml/profiler";
import { detectAnomalies } from "../ml/anomaly";
import { detectTrend } from "../ml/trend";
import { clusterData } from "../ml/clustering";
import { computeCorrelation, detectDuplicates } from "../ml/correlation";
import { predictColumn } from "../ml/regression";
import { computeHistogram } from "../ml/histogram";
import type { WorkerRequest, WorkerResponse } from "../../types/ml";

// ── ML libs (zero-dependency, bundled with the worker) ───────────────────────
import * as ss from "../ml/simple-stats";
import { kmeans } from "../ml/kmeans";
import { SimpleLinearRegression } from "../ml/linear-regression";
import Fuse from "fuse.js";

// ─── Message Handler ──────────────────────────────────────────────────────────

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;
  const start = performance.now();

  try {
    const data = JSON.parse(payload.csvData) as Record<
      string,
      (string | number | null)[]
    >;
    const opts = payload.options;
    let result: unknown;

    switch (type) {
      case "profile": {
        result = profileDataset(data, (opts.fileName as string) || "file.csv");
        break;
      }

      case "anomaly": {
        const numericData = data as Record<string, (number | null)[]>;
        result = detectAnomalies(numericData, opts.columns as string[], ss, {
          zThreshold: (opts.zThreshold as number) ?? 2.5,
        });
        break;
      }

      case "trend": {
        result = detectTrend(
          data,
          opts.valueColumn as string,
          opts.timeColumn as string,
          SimpleLinearRegression,
          (opts.forecastPeriods as number) ?? 3,
        );
        break;
      }

      case "forecast": {
        result = detectTrend(
          data,
          opts.valueColumn as string,
          opts.timeColumn as string,
          SimpleLinearRegression,
          (opts.forecastPeriods as number) ?? 6,
        );
        break;
      }

      case "cluster": {
        const numericData = data as Record<string, (number | null)[]>;
        result = clusterData(
          numericData,
          opts.columns as string[],
          kmeans,
          opts.k as number | undefined,
        );
        break;
      }

      case "correlation": {
        const numericData = data as Record<string, (number | null)[]>;
        result = computeCorrelation(numericData, opts.columns as string[]);
        break;
      }

      case "duplicates": {
        result = detectDuplicates(data, opts.columns as string[], Fuse, {
          fuzzyThreshold: (opts.fuzzyThreshold as number) ?? 0.15,
        });
        break;
      }

      // Gap L fix: regression case
      case "regression": {
        const numericData = data as Record<string, (number | null)[]>;
        result = predictColumn(
          numericData,
          opts.targetColumn as string,
          opts.featureColumns as string[],
        );
        break;
      }

      // Gap L fix: histogram case
      case "histogram": {
        result = computeHistogram(
          data,
          opts.column as string,
          opts.binCount as number | undefined,
        );
        break;
      }

      default:
        throw new Error(`Unknown ML type: ${type}`);
    }

    const response: WorkerResponse = {
      id,
      success: true,
      result,
      executionMs: Math.round(performance.now() - start),
    };
    self.postMessage(response);
  } catch (err) {
    const response: WorkerResponse = {
      id,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      executionMs: Math.round(performance.now() - start),
    };
    self.postMessage(response);
  }
};
