/**
 * app/api/ml/route.ts
 * Next.js 14 App Router API route
 * SSR fallback for environments where Web Workers aren't available (Teams adapter, etc.)
 *
 * Gap D fix: tenant access control enforced
 * Gap N fix: input validation + maxRows/maxFileSize checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { runMLPipeline, parseCSVtoColumns } from '../../../lib/ml/orchestrator';
import { buildParsedIntent } from '../../../lib/nlp/intent-mapper';
import type { DatasetProfile, TenantMLConfig } from '../../../types/ml';
import { INTENT_TO_ANALYSIS } from '../../../types/ml';

// ── ML libs (server-side) ─────────────────────────────────────────────────────
import * as ss from 'simple-statistics';
import { kmeans } from 'ml-kmeans';
import { SimpleLinearRegression } from 'ml-regression';
import Fuse from 'fuse.js';

// ── Tenant config loader (replace with your actual config store) ───────────────
function getTenantConfig(tenantId: string): TenantMLConfig {
  return {
    tenantId,
    maxFileSize: 10 * 1024 * 1024,   // 10 MB
    allowedAnalyses: ['profile', 'anomaly', 'trend', 'cluster', 'correlation', 'duplicates', 'histogram', 'forecast', 'summary', 'regression'],
    maxRows: 50000,
    enableWebWorker: true,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      nlpResult?:  { intent: string; score: number };
      rawQuery?:   string;
      csvData?:    string;
      profile?:    DatasetProfile;
      tenantId?:   string;
      fileName?:   string;
    };

    // ── Input validation ──────────────────────────────────────────────────
    if (!body.nlpResult || !body.rawQuery || !body.csvData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: nlpResult, rawQuery, csvData' },
        { status: 400 }
      );
    }

    const tenantConfig = getTenantConfig(body.tenantId ?? 'default');

    // ── Gap N: File size check ────────────────────────────────────────────
    const csvByteSize = new Blob([body.csvData]).size;
    if (tenantConfig.maxFileSize > 0 && csvByteSize > tenantConfig.maxFileSize) {
      return NextResponse.json(
        { success: false, error: `File size (${(csvByteSize / 1024 / 1024).toFixed(1)}MB) exceeds limit (${(tenantConfig.maxFileSize / 1024 / 1024).toFixed(0)}MB)` },
        { status: 413 }
      );
    }

    // Parse columns for entity extraction
    const data         = parseCSVtoColumns(body.csvData);
    const columnNames  = Object.keys(data);

    // ── Gap N: Row count check ────────────────────────────────────────────
    const rowCount = data[columnNames[0]]?.length ?? 0;
    if (tenantConfig.maxRows > 0 && rowCount > tenantConfig.maxRows) {
      return NextResponse.json(
        { success: false, error: `Row count (${rowCount.toLocaleString()}) exceeds limit (${tenantConfig.maxRows.toLocaleString()})` },
        { status: 413 }
      );
    }

    // Build intent
    const intent = buildParsedIntent(body.nlpResult, body.rawQuery, columnNames);

    // ── Gap D: Tenant access control ──────────────────────────────────────
    const analysisType = INTENT_TO_ANALYSIS[intent.intent];
    if (analysisType && tenantConfig.allowedAnalyses.length > 0 &&
        !tenantConfig.allowedAnalyses.includes(analysisType)) {
      return NextResponse.json(
        { success: false, error: `Analysis type "${analysisType}" is not enabled for tenant "${tenantConfig.tenantId}"` },
        { status: 403 }
      );
    }

    const profile = body.profile ?? {
      rowCount,
      columnCount: columnNames.length,
      columns: [],
      memorySizeKB: Math.round(csvByteSize / 1024),
      fileName: body.fileName ?? 'upload.csv',
      parsedAt: new Date(),
    };

    const result = await runMLPipeline(intent, {
      data,
      profile,
      fileName: body.fileName ?? 'upload.csv',
      tenantConfig,
      ss,
      kmeans,
      SimpleLinearRegression,
      Fuse,
    });

    return NextResponse.json({ success: true, result });

  } catch (err) {
    console.error('[ML API Error]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';  // not edge — needs Node.js ML libs
export const maxDuration = 30;    // 30s timeout for large datasets
