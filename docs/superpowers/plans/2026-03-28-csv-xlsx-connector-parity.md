# CSV/XLSX File Connector Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring CSV/XLSX file connectors to full parity with SQL connectors -- tabbed detail page, visual query builder, preview, save/publish to engine, and dashboard placement.

**Architecture:** New detail page at `/admin/connectors/file/[id]` with 5 tabs (File Info, Schema, Query Builder, Preview, Saved Queries). Backend endpoints under `/api/admin/file-sources` handle validation, pipeline execution, and saved query CRUD. Query builder constructs a pipeline object (SELECT/WHERE/GROUP BY/HAVING/ORDER BY/LIMIT) that the backend csv-analyzer executes.

**Tech Stack:** Next.js 14 (App Router), React 18, Tailwind CSS with design tokens, Express backend, XLSX library for file parsing, JSON-based persistence (db.json).

**Spec:** [docs/superpowers/specs/2026-03-28-csv-xlsx-connector-parity-design.md](../specs/2026-03-28-csv-xlsx-connector-parity-design.md)

---

## File Structure

### New Files

| File                                                          | Responsibility                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| `services/engine/src/routes/admin/file-sources.ts`            | Backend API: validate, preview, saved queries CRUD, publish |
| `src/app/admin/connectors/file/[id]/page.tsx`                 | Detail page shell with 5 tabs                               |
| `src/components/admin/file-connector/FileInfoTab.tsx`         | File metadata, validation banner, column config             |
| `src/components/admin/file-connector/SchemaTab.tsx`           | Column browser with types, stats, role dropdowns            |
| `src/components/admin/file-connector/QueryBuilderTab.tsx`     | Pipeline builder orchestrator                               |
| `src/components/admin/file-connector/PipelineStepBar.tsx`     | Step navigation (SELECT/WHERE/GROUP BY/etc.)                |
| `src/components/admin/file-connector/ColumnPicker.tsx`        | Left panel column selector with search                      |
| `src/components/admin/file-connector/ConditionBuilder.tsx`    | WHERE/HAVING condition rows                                 |
| `src/components/admin/file-connector/AggregationConfig.tsx`   | GROUP BY aggregation config                                 |
| `src/components/admin/file-connector/PreviewTab.tsx`          | Execute pipeline, show table + chart                        |
| `src/components/admin/file-connector/SavedQueriesTab.tsx`     | Save, configure, publish, manage queries                    |
| `src/components/admin/file-connector/AddToDashboardModal.tsx` | Dashboard placement modal                                   |
| `src/components/admin/file-connector/types.ts`                | Shared TypeScript types for pipeline, config                |

### Modified Files

| File                                                     | Changes                              |
| -------------------------------------------------------- | ------------------------------------ |
| `services/engine/src/routes/admin/index.ts`              | Register file-sources router         |
| `services/engine/src/core/api-connector/csv-analyzer.ts` | Add pipeline execution function      |
| `src/app/admin/connectors/file/page.tsx`                 | Add click-to-navigate to detail page |

---

## Phase 1: Types & Backend API

### Task 1: Shared Types

**Files:**

- Create: `src/components/admin/file-connector/types.ts`

- [ ] **Step 1: Create the shared types file**

```typescript
// src/components/admin/file-connector/types.ts

export interface FilterCondition {
  column: string;
  operator:
    | "eq"
    | "neq"
    | "contains"
    | "starts_with"
    | "ends_with"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "between"
    | "in"
    | "is_null"
    | "is_not_null";
  value: string | number | string[];
  logic?: "and" | "or";
}

export interface Aggregation {
  column: string;
  operation: "sum" | "avg" | "count" | "min" | "max";
}

export interface QueryPipeline {
  select: string[];
  where?: FilterCondition[];
  groupBy?: {
    columns: string[];
    aggregations: Aggregation[];
  };
  having?: FilterCondition[];
  orderBy?: { column: string; dir: "asc" | "desc" }[];
  limit?: number;
}

export interface FileSourceConfig {
  id: string;
  name: string;
  description: string;
  source: string;
  type: "csv" | "xlsx";
  filePath: string;
  fileBaseDir?: string;
  sheetName?: string;
  columnConfig?: {
    idColumns?: string[];
    dateColumns?: string[];
    labelColumns?: string[];
    valueColumns?: string[];
    ignoreColumns?: string[];
  };
}

export interface SchemaColumn {
  name: string;
  type: "string" | "number" | "date";
  distinctCount: number;
  nullCount: number;
  sampleValues: (string | { value: string; count: number })[];
  role?: "id" | "label" | "value" | "date" | "ignore";
}

export interface FileValidation {
  status: "valid" | "error" | "warning";
  message: string;
  rowCount: number;
  columnCount: number;
  fileType: "csv" | "xlsx";
  lastModified: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  description: string;
  displayGroup: string;
  pipeline: QueryPipeline;
  chartConfig?: {
    defaultType: string;
    labelKey: string;
    valueKeys: string[];
  };
  filterParams?: Array<{
    column: string;
    binding: "column" | "query_param" | "path" | "body";
    inputType:
      | "select"
      | "multi_select"
      | "text"
      | "date_range"
      | "number_range";
  }>;
  drillDown?: Array<{
    sourceColumn: string;
    targetQuery: string;
    targetFilter: string;
  }>;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/file-connector/types.ts
git commit -m "feat: add shared types for file connector pipeline and config"
```

---

### Task 2: Backend - Pipeline Execution in CSV Analyzer

**Files:**

- Modify: `services/engine/src/core/api-connector/csv-analyzer.ts`

- [ ] **Step 1: Read the current csv-analyzer.ts to understand the existing functions**

Read the file to find where to add the new function. The file already has `parseCsv`, `aggregateColumn`, `groupBy`, `sortRows`, `filterRows` functions.

- [ ] **Step 2: Add the executePipeline function**

Add at the end of the file:

```typescript
/**
 * Execute a query pipeline against parsed CSV/XLSX data.
 * Pipeline steps: SELECT → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT
 */
export function executePipeline(
  data: CsvData,
  pipeline: {
    select?: string[];
    where?: Array<{
      column: string;
      operator: string;
      value: string | number | string[];
      logic?: "and" | "or";
    }>;
    groupBy?: {
      columns: string[];
      aggregations: Array<{ column: string; operation: string }>;
    };
    having?: Array<{
      column: string;
      operator: string;
      value: string | number | string[];
      logic?: "and" | "or";
    }>;
    orderBy?: Array<{ column: string; dir: "asc" | "desc" }>;
    limit?: number;
  },
): {
  headers: string[];
  rows: Record<string, string | number>[];
  totalSourceRows: number;
} {
  const totalSourceRows = data.rows.length;
  let rows = [...data.rows];
  let headers = pipeline.select?.length ? pipeline.select : [...data.headers];

  // 1. SELECT — filter columns
  if (pipeline.select?.length) {
    rows = rows.map((r) => {
      const out: Record<string, string | number> = {};
      for (const col of pipeline.select!) {
        if (col in r) out[col] = r[col];
      }
      return out;
    });
  }

  // 2. WHERE — filter rows
  if (pipeline.where?.length) {
    rows = rows.filter((row) => evaluateConditions(row, pipeline.where!));
  }

  // 3. GROUP BY — group and aggregate
  if (pipeline.groupBy) {
    const { columns: groupCols, aggregations: aggs } = pipeline.groupBy;
    const groups = new Map<string, Record<string, string | number>[]>();
    for (const row of rows) {
      const key = groupCols.map((c) => String(row[c] ?? "")).join("||");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const aggHeaders = aggs.map(
      (a) => `${a.operation.toUpperCase()}(${a.column})`,
    );
    headers = [...groupCols, ...aggHeaders, "count"];

    rows = Array.from(groups.entries()).map(([, groupRows]) => {
      const out: Record<string, string | number> = {};
      for (const gc of groupCols) out[gc] = groupRows[0][gc];
      for (const agg of aggs) {
        const vals = groupRows
          .map((r) => Number(r[agg.column]))
          .filter((v) => !isNaN(v));
        switch (agg.operation) {
          case "sum":
            out[`SUM(${agg.column})`] = vals.reduce((a, b) => a + b, 0);
            break;
          case "avg":
            out[`AVG(${agg.column})`] = vals.length
              ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
              : 0;
            break;
          case "min":
            out[`MIN(${agg.column})`] = vals.length ? Math.min(...vals) : 0;
            break;
          case "max":
            out[`MAX(${agg.column})`] = vals.length ? Math.max(...vals) : 0;
            break;
          case "count":
            out[`COUNT(${agg.column})`] = groupRows.length;
            break;
        }
      }
      out.count = groupRows.length;
      return out;
    });
  }

  // 4. HAVING — filter grouped results
  if (pipeline.having?.length) {
    rows = rows.filter((row) => evaluateConditions(row, pipeline.having!));
  }

  // 5. ORDER BY
  if (pipeline.orderBy?.length) {
    rows.sort((a, b) => {
      for (const { column, dir } of pipeline.orderBy!) {
        const va = a[column] ?? "";
        const vb = b[column] ?? "";
        const numA = Number(va);
        const numB = Number(vb);
        const cmp =
          !isNaN(numA) && !isNaN(numB)
            ? numA - numB
            : String(va).localeCompare(String(vb));
        if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }

  // 6. LIMIT
  if (pipeline.limit && pipeline.limit > 0) {
    rows = rows.slice(0, pipeline.limit);
  }

  return { headers, rows, totalSourceRows };
}

function evaluateConditions(
  row: Record<string, string | number>,
  conditions: Array<{
    column: string;
    operator: string;
    value: string | number | string[];
    logic?: "and" | "or";
  }>,
): boolean {
  let result = true;
  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];
    const cellVal = row[c.column];
    const matches = evaluateSingle(cellVal, c.operator, c.value);
    if (i === 0) {
      result = matches;
    } else {
      const logic = conditions[i - 1].logic ?? "and";
      result = logic === "and" ? result && matches : result || matches;
    }
  }
  return result;
}

function evaluateSingle(
  cellVal: string | number | undefined,
  operator: string,
  value: string | number | string[],
): boolean {
  const s = String(cellVal ?? "").toLowerCase();
  const v = Array.isArray(value) ? value : String(value).toLowerCase();
  switch (operator) {
    case "eq":
      return s === v;
    case "neq":
      return s !== v;
    case "contains":
      return typeof v === "string" && s.includes(v);
    case "starts_with":
      return typeof v === "string" && s.startsWith(v);
    case "ends_with":
      return typeof v === "string" && s.endsWith(v);
    case "gt":
      return Number(cellVal) > Number(value);
    case "lt":
      return Number(cellVal) < Number(value);
    case "gte":
      return Number(cellVal) >= Number(value);
    case "lte":
      return Number(cellVal) <= Number(value);
    case "between":
      return (
        Array.isArray(value) &&
        Number(cellVal) >= Number(value[0]) &&
        Number(cellVal) <= Number(value[1])
      );
    case "in":
      return (
        Array.isArray(value) &&
        value.map((x) => String(x).toLowerCase()).includes(s)
      );
    case "is_null":
      return cellVal == null || s === "";
    case "is_not_null":
      return cellVal != null && s !== "";
    default:
      return true;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add services/engine/src/core/api-connector/csv-analyzer.ts
git commit -m "feat: add executePipeline function to csv-analyzer for query builder"
```

---

### Task 3: Backend - File Sources API Routes

**Files:**

- Create: `services/engine/src/routes/admin/file-sources.ts`
- Modify: `services/engine/src/routes/admin/index.ts`

- [ ] **Step 1: Create the file-sources router**

```typescript
// services/engine/src/routes/admin/file-sources.ts
import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import { join, extname } from "path";
import {
  parseCsv,
  executePipeline,
} from "../../core/api-connector/csv-analyzer";
import { logAudit } from "../../lib/audit-logger";
import { paths } from "../../lib/env-config";

const router = Router();

// Helper: read db.json
async function readDb(): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(paths.mockApi.dbJson, "utf-8");
  return JSON.parse(raw);
}

// Helper: write db.json
async function writeDb(data: Record<string, unknown>): Promise<void> {
  await fs.writeFile(
    paths.mockApi.dbJson,
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

// Helper: resolve file path
function resolveFilePath(filePath: string, fileBaseDir?: string): string {
  if (fileBaseDir) return join(fileBaseDir, filePath);
  return join(process.cwd(), filePath);
}

// Helper: read and parse file
async function loadFileData(
  filePath: string,
  fileBaseDir?: string,
  sheetName?: string,
) {
  const fullPath = resolveFilePath(filePath, fileBaseDir);
  const content = await fs.readFile(fullPath);
  return parseCsv(content, sheetName);
}

// ── GET / — List all file sources (queries with type csv/xlsx) ──
router.get("/", async (_req: Request, res: Response) => {
  try {
    const db = await readDb();
    const queries = (db.queries as Array<Record<string, unknown>>) ?? [];
    const fileSources = queries.filter(
      (q) => q.type === "csv" || q.type === "xlsx" || q.type === "file",
    );
    return res.json({ sources: fileSources, total: fileSources.length });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── GET /:id — Get single file source ──
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    const queries = (db.queries as Array<Record<string, unknown>>) ?? [];
    const source = queries.find(
      (q) => q.id === req.params.id || q.name === req.params.id,
    );
    if (!source) return res.status(404).json({ error: "Source not found" });
    return res.json(source);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── POST /:id/validate — Validate file exists and is parseable ──
router.post("/:id/validate", async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    const queries = (db.queries as Array<Record<string, unknown>>) ?? [];
    const source = queries.find(
      (q) => q.id === req.params.id || q.name === req.params.id,
    );
    if (!source) return res.status(404).json({ error: "Source not found" });

    const filePath = source.filePath as string;
    const fileBaseDir = source.fileBaseDir as string | undefined;
    const sheetName = source.sheetName as string | undefined;
    const fullPath = resolveFilePath(filePath, fileBaseDir);

    const stat = await fs.stat(fullPath);
    const data = await loadFileData(filePath, fileBaseDir, sheetName);
    const ext = extname(filePath).toLowerCase();

    return res.json({
      status: "valid",
      message: `File validated — ${data.rows.length} rows, ${data.headers.length} columns`,
      rowCount: data.rows.length,
      columnCount: data.headers.length,
      fileType: ext === ".xlsx" || ext === ".xls" ? "xlsx" : "csv",
      lastModified: stat.mtime.toISOString(),
      headers: data.headers,
    });
  } catch (err) {
    return res.json({
      status: "error",
      message: String(err),
      rowCount: 0,
      columnCount: 0,
      fileType: "csv",
      lastModified: "",
      headers: [],
    });
  }
});

// ── POST /:id/schema — Get column schema with stats ──
router.post("/:id/schema", async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    const queries = (db.queries as Array<Record<string, unknown>>) ?? [];
    const source = queries.find(
      (q) => q.id === req.params.id || q.name === req.params.id,
    );
    if (!source) return res.status(404).json({ error: "Source not found" });

    const data = await loadFileData(
      source.filePath as string,
      source.fileBaseDir as string | undefined,
      source.sheetName as string | undefined,
    );

    const schema = data.headers.map((h) => {
      const values = data.rows.map((r) => r[h]);
      const nonNull = values.filter((v) => v != null && v !== "");
      const distinct = new Set(nonNull.map(String));
      const isNumeric =
        nonNull.length > 0 && nonNull.every((v) => !isNaN(Number(v)));
      const sampleValues = Array.from(distinct).slice(0, 5);

      return {
        name: h,
        type: isNumeric ? "number" : "string",
        distinctCount: distinct.size,
        nullCount: values.length - nonNull.length,
        sampleValues,
      };
    });

    return res.json({
      schema,
      rowCount: data.rows.length,
      columnCount: data.headers.length,
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── POST /:id/preview — Execute a query pipeline ──
router.post("/:id/preview", async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    const queries = (db.queries as Array<Record<string, unknown>>) ?? [];
    const source = queries.find(
      (q) => q.id === req.params.id || q.name === req.params.id,
    );
    if (!source) return res.status(404).json({ error: "Source not found" });

    const pipeline = req.body.pipeline;
    if (!pipeline)
      return res.status(400).json({ error: "pipeline is required in body" });

    const start = Date.now();
    const data = await loadFileData(
      source.filePath as string,
      source.fileBaseDir as string | undefined,
      source.sheetName as string | undefined,
    );
    const result = executePipeline(data, pipeline);
    const durationMs = Date.now() - start;

    return res.json({
      headers: result.headers,
      rows: result.rows,
      rowCount: result.rows.length,
      totalSourceRows: result.totalSourceRows,
      durationMs,
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── GET /:id/queries — List saved queries for this source ──
router.get("/:id/queries", async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    const savedQueries =
      ((db as Record<string, unknown>).fileSourceQueries as Array<
        Record<string, unknown>
      >) ?? [];
    const sourceQueries = savedQueries.filter(
      (q) => q.sourceId === req.params.id,
    );
    return res.json({ queries: sourceQueries });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── POST /:id/queries — Save a new query ──
router.post("/:id/queries", async (req: Request, res: Response) => {
  try {
    const db = (await readDb()) as Record<string, unknown>;
    if (!db.fileSourceQueries) db.fileSourceQueries = [];
    const savedQueries = db.fileSourceQueries as Array<Record<string, unknown>>;

    const id = `fsq-${Date.now()}`;
    const newQuery = {
      id,
      sourceId: req.params.id,
      ...req.body,
      status: req.body.status ?? "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    savedQueries.push(newQuery);
    await writeDb(db);

    logAudit({
      action: "create",
      resource: "file-source-query",
      resourceId: id,
      ip: req.ip,
    });
    return res.status(201).json(newQuery);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── PUT /:id/queries/:qid — Update saved query ──
router.put("/:id/queries/:qid", async (req: Request, res: Response) => {
  try {
    const db = (await readDb()) as Record<string, unknown>;
    const savedQueries =
      (db.fileSourceQueries as Array<Record<string, unknown>>) ?? [];
    const idx = savedQueries.findIndex((q) => q.id === req.params.qid);
    if (idx === -1) return res.status(404).json({ error: "Query not found" });

    savedQueries[idx] = {
      ...savedQueries[idx],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    await writeDb(db);

    logAudit({
      action: "update",
      resource: "file-source-query",
      resourceId: req.params.qid,
      ip: req.ip,
    });
    return res.json(savedQueries[idx]);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── DELETE /:id/queries/:qid — Delete saved query ──
router.delete("/:id/queries/:qid", async (req: Request, res: Response) => {
  try {
    const db = (await readDb()) as Record<string, unknown>;
    const savedQueries =
      (db.fileSourceQueries as Array<Record<string, unknown>>) ?? [];
    const idx = savedQueries.findIndex((q) => q.id === req.params.qid);
    if (idx === -1) return res.status(404).json({ error: "Query not found" });

    savedQueries.splice(idx, 1);
    db.fileSourceQueries = savedQueries;
    await writeDb(db);

    logAudit({
      action: "delete",
      resource: "file-source-query",
      resourceId: req.params.qid,
      ip: req.ip,
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── POST /:id/queries/:qid/publish — Publish query to engine ──
router.post(
  "/:id/queries/:qid/publish",
  async (req: Request, res: Response) => {
    try {
      const db = (await readDb()) as Record<string, unknown>;
      const savedQueries =
        (db.fileSourceQueries as Array<Record<string, unknown>>) ?? [];
      const savedQuery = savedQueries.find((q) => q.id === req.params.qid);
      if (!savedQuery)
        return res.status(404).json({ error: "Query not found" });

      const queries = (db.queries as Array<Record<string, unknown>>) ?? [];
      const source = queries.find(
        (q) => q.id === req.params.id || q.name === req.params.id,
      );
      if (!source) return res.status(404).json({ error: "Source not found" });

      // Create or update a query entry in the main queries array
      const queryName = savedQuery.name as string;
      const existingIdx = queries.findIndex((q) => q.name === queryName);

      const publishedQuery = {
        id:
          existingIdx >= 0 ? queries[existingIdx].id : `q${queries.length + 1}`,
        name: queryName,
        description: savedQuery.description ?? "",
        type: source.type,
        filePath: source.filePath,
        fileBaseDir: source.fileBaseDir,
        sheetName: source.sheetName,
        source:
          savedQuery.displayGroup ??
          (source as Record<string, unknown>).source ??
          "default",
        filters: (
          (savedQuery.filterParams as Array<Record<string, unknown>>) ?? []
        ).map((fp) => ({
          key: fp.column,
          binding: fp.binding ?? "column",
        })),
        chartConfig: savedQuery.chartConfig ?? {},
        columnConfig: (source as Record<string, unknown>).columnConfig ?? {},
        drillDown: savedQuery.drillDown ?? [],
        pipeline: savedQuery.pipeline,
      };

      if (existingIdx >= 0) {
        queries[existingIdx] = { ...queries[existingIdx], ...publishedQuery };
      } else {
        queries.push(publishedQuery);
      }

      // Update saved query status
      const sqIdx = savedQueries.findIndex((q) => q.id === req.params.qid);
      if (sqIdx >= 0) savedQueries[sqIdx].status = "published";

      db.queries = queries;
      db.fileSourceQueries = savedQueries;
      await writeDb(db);

      logAudit({
        action: "publish",
        resource: "file-source-query",
        resourceId: req.params.qid,
        ip: req.ip,
      });
      return res.json({ success: true, query: publishedQuery });
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  },
);

export default router;
```

- [ ] **Step 2: Register the router in admin/index.ts**

Read `services/engine/src/routes/admin/index.ts` and add:

```typescript
import fileSourcesRouter from "./file-sources";
// ... after other router.use() calls:
router.use("/file-sources", fileSourcesRouter);
```

- [ ] **Step 3: Commit**

```bash
git add services/engine/src/routes/admin/file-sources.ts services/engine/src/routes/admin/index.ts
git commit -m "feat: add file-sources backend API with validate, schema, preview, saved queries CRUD, publish"
```

---

## Phase 2: Frontend - Detail Page Shell & File Info Tab

### Task 4: Detail Page with Tabs

**Files:**

- Create: `src/app/admin/connectors/file/[id]/page.tsx`

- [ ] **Step 1: Create the detail page with tab navigation**

```tsx
// src/app/admin/connectors/file/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ContextualTopBar } from "@/components/shell/ContextualTopBar";
import { FileInfoTab } from "@/components/admin/file-connector/FileInfoTab";
import { SchemaTab } from "@/components/admin/file-connector/SchemaTab";
import { QueryBuilderTab } from "@/components/admin/file-connector/QueryBuilderTab";
import { PreviewTab } from "@/components/admin/file-connector/PreviewTab";
import { SavedQueriesTab } from "@/components/admin/file-connector/SavedQueriesTab";
import type {
  FileSourceConfig,
  SchemaColumn,
  QueryPipeline,
} from "@/components/admin/file-connector/types";

const TABS = [
  "File Info",
  "Schema",
  "Query Builder",
  "Preview",
  "Saved Queries",
] as const;
type Tab = (typeof TABS)[number];

export default function FileConnectorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sourceId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("File Info");
  const [source, setSource] = useState<FileSourceConfig | null>(null);
  const [schema, setSchema] = useState<SchemaColumn[]>([]);
  const [pipeline, setPipeline] = useState<QueryPipeline>({ select: [] });
  const [previewData, setPreviewData] = useState<{
    headers: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    totalSourceRows: number;
    durationMs: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch source details
  useEffect(() => {
    fetch(`/api/admin/file-sources/${sourceId}`)
      .then((r) => r.json())
      .then((data) => {
        setSource(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sourceId]);

  // Fetch schema
  useEffect(() => {
    if (!sourceId) return;
    fetch(`/api/admin/file-sources/${sourceId}/schema`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.schema) setSchema(data.schema);
      })
      .catch(() => {});
  }, [sourceId]);

  const handleRunPreview = useCallback(async () => {
    const res = await fetch(`/api/admin/file-sources/${sourceId}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline }),
    });
    const data = await res.json();
    setPreviewData(data);
    setActiveTab("Preview");
  }, [sourceId, pipeline]);

  if (loading) {
    return (
      <>
        <ContextualTopBar title="Loading..." />
        <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
          Loading file source...
        </div>
      </>
    );
  }

  if (!source) {
    return (
      <>
        <ContextualTopBar title="Not Found" />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="text-[14px] font-medium text-[var(--text-primary)] mb-1">
            Source not found
          </div>
          <button
            onClick={() => router.push("/admin/connectors/file")}
            className="text-[13px] text-[var(--brand)] mt-2"
          >
            Back to file sources
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <ContextualTopBar title="Admin">
        <span className="text-[11px] text-[var(--text-muted)]">
          Connectors / CSV-XLSX / {source.name}
        </span>
      </ContextualTopBar>

      {/* Tab bar */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border)] px-4 flex gap-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-[12px] font-medium transition-colors ${
              activeTab === tab
                ? "text-[var(--brand)] border-b-2 border-[var(--brand)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "File Info" && (
          <FileInfoTab
            source={source}
            onUpdate={setSource}
            sourceId={sourceId}
          />
        )}
        {activeTab === "Schema" && (
          <SchemaTab schema={schema} source={source} />
        )}
        {activeTab === "Query Builder" && (
          <QueryBuilderTab
            schema={schema}
            pipeline={pipeline}
            onPipelineChange={setPipeline}
            onRunPreview={handleRunPreview}
          />
        )}
        {activeTab === "Preview" && (
          <PreviewTab data={previewData} pipeline={pipeline} />
        )}
        {activeTab === "Saved Queries" && (
          <SavedQueriesTab
            sourceId={sourceId}
            source={source}
            pipeline={pipeline}
          />
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/connectors/file/[id]/page.tsx
git commit -m "feat: add file connector detail page with 5-tab layout"
```

---

### Task 5: File Info Tab Component

**Files:**

- Create: `src/components/admin/file-connector/FileInfoTab.tsx`

- [ ] **Step 1: Create FileInfoTab**

```tsx
// src/components/admin/file-connector/FileInfoTab.tsx
"use client";

import { useState, useCallback } from "react";
import type { FileSourceConfig, FileValidation } from "./types";

interface FileInfoTabProps {
  source: FileSourceConfig;
  onUpdate: (source: FileSourceConfig) => void;
  sourceId: string;
}

export function FileInfoTab({ source, onUpdate, sourceId }: FileInfoTabProps) {
  const [validation, setValidation] = useState<FileValidation | null>(null);
  const [validating, setValidating] = useState(false);

  const handleValidate = useCallback(async () => {
    setValidating(true);
    try {
      const res = await fetch(`/api/admin/file-sources/${sourceId}/validate`, {
        method: "POST",
      });
      const data = await res.json();
      setValidation(data);
    } catch {
      setValidation({
        status: "error",
        message: "Validation request failed",
        rowCount: 0,
        columnCount: 0,
        fileType: "csv",
        lastModified: "",
      });
    } finally {
      setValidating(false);
    }
  }, [sourceId]);

  const statusColors = {
    valid: {
      bg: "bg-[var(--success-subtle)]",
      border: "border-[var(--success)]",
      text: "text-[var(--success)]",
      icon: "\u2713",
    },
    error: {
      bg: "bg-[var(--danger-subtle)]",
      border: "border-[var(--danger)]",
      text: "text-[var(--danger)]",
      icon: "\u2717",
    },
    warning: {
      bg: "bg-[var(--warning-subtle)]",
      border: "border-[var(--warning)]",
      text: "text-[var(--warning)]",
      icon: "!",
    },
  };

  return (
    <div className="p-5 max-w-3xl">
      {/* Validation banner */}
      {validation && (
        <div
          className={`flex items-center gap-3 ${statusColors[validation.status].bg} border ${statusColors[validation.status].border} rounded-[var(--radius-md)] p-3 mb-5`}
        >
          <div
            className={`w-6 h-6 rounded-full ${statusColors[validation.status].text} bg-[var(--bg-primary)] flex items-center justify-center text-[12px] font-bold`}
          >
            {statusColors[validation.status].icon}
          </div>
          <div>
            <div
              className={`text-[13px] font-semibold ${statusColors[validation.status].text}`}
            >
              {validation.status === "valid"
                ? "File validated"
                : validation.status === "error"
                  ? "Validation failed"
                  : "Warning"}
            </div>
            <div className="text-[11px] text-[var(--text-secondary)]">
              {validation.message}
            </div>
          </div>
        </div>
      )}

      {/* Source details form */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Field label="Source Name" value={source.name} />
        <Field label="Source Group" value={source.source || "default"} />
        <Field label="Description" value={source.description} span={2} />
        <Field label="File Path" value={source.filePath} span={2} mono />
        <Field label="File Type" value={source.type.toUpperCase()} />
        <Field
          label="Sheet Name"
          value={source.sheetName || "N/A"}
          muted={!source.sheetName}
        />
      </div>

      {/* Column configuration */}
      {source.columnConfig && (
        <div className="mb-6">
          <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">
            Column Configuration
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="ID Columns"
              value={source.columnConfig.idColumns?.join(", ") || "--"}
            />
            <Field
              label="Date Columns"
              value={source.columnConfig.dateColumns?.join(", ") || "--"}
            />
            <Field
              label="Label Columns"
              value={source.columnConfig.labelColumns?.join(", ") || "--"}
            />
            <Field
              label="Value Columns"
              value={source.columnConfig.valueColumns?.join(", ") || "--"}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleValidate}
          disabled={validating}
          className="bg-[var(--brand)] text-[var(--brand-text)] px-4 py-2 rounded-[var(--radius-md)] text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
        >
          {validating ? "Validating..." : "Validate File"}
        </button>
        <button className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-4 py-2 rounded-[var(--radius-md)] text-[13px] border border-[var(--border)]">
          Save Changes
        </button>
        <button className="bg-[var(--bg-primary)] text-[var(--danger)] px-4 py-2 rounded-[var(--radius-md)] text-[13px] border border-[var(--danger-subtle)]">
          Delete Source
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  span,
  mono,
  muted,
}: {
  label: string;
  value: string;
  span?: number;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 text-[13px] ${mono ? "font-mono bg-[var(--bg-secondary)]" : "bg-[var(--bg-primary)]"} ${muted ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}
      >
        {value}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/file-connector/FileInfoTab.tsx
git commit -m "feat: add FileInfoTab with validation banner and source details"
```

---

### Task 6: Schema Tab Component

**Files:**

- Create: `src/components/admin/file-connector/SchemaTab.tsx`

- [ ] **Step 1: Create SchemaTab**

```tsx
// src/components/admin/file-connector/SchemaTab.tsx
"use client";

import type { FileSourceConfig, SchemaColumn } from "./types";

interface SchemaTabProps {
  schema: SchemaColumn[];
  source: FileSourceConfig;
}

const typeColors: Record<string, string> = {
  string: "bg-[var(--brand-subtle)] text-[var(--brand)]",
  number: "bg-[var(--success-subtle)] text-[var(--success)]",
  date: "bg-[var(--warning-subtle)] text-[var(--warning)]",
};

export function SchemaTab({ schema, source }: SchemaTabProps) {
  const numericCount = schema.filter((c) => c.type === "number").length;
  const stringCount = schema.filter((c) => c.type === "string").length;

  return (
    <div className="p-5">
      {/* Summary bar */}
      <div className="flex gap-4 mb-4 text-[12px]">
        <Stat label="Columns" value={schema.length} />
        <Stat label="Numeric" value={numericCount} color="var(--brand)" />
        <Stat label="String" value={stringCount} color="var(--success)" />
      </div>

      {/* Column table */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden text-[11px]">
        <div className="flex bg-[var(--bg-tertiary)] border-b border-[var(--border)] font-semibold text-[var(--text-muted)]">
          <div className="w-[180px] px-3 py-2">Column Name</div>
          <div className="w-[80px] px-3 py-2">Type</div>
          <div className="w-[80px] px-3 py-2">Distinct</div>
          <div className="w-[60px] px-3 py-2">Nulls</div>
          <div className="flex-1 px-3 py-2">Sample Values</div>
        </div>
        {schema.map((col) => (
          <div
            key={col.name}
            className="flex border-b border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <div className="w-[180px] px-3 py-2 font-medium text-[var(--text-primary)]">
              {col.name}
            </div>
            <div className="w-[80px] px-3 py-2">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${typeColors[col.type] ?? ""}`}
              >
                {col.type}
              </span>
            </div>
            <div className="w-[80px] px-3 py-2">{col.distinctCount}</div>
            <div className="w-[60px] px-3 py-2">{col.nullCount}</div>
            <div className="flex-1 px-3 py-2 flex gap-1 flex-wrap">
              {col.sampleValues.slice(0, 4).map((v, i) => (
                <span
                  key={i}
                  className="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[10px] max-w-[100px] truncate"
                >
                  {typeof v === "object"
                    ? ((v as { value?: string }).value ?? String(v))
                    : String(v)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2">
      <span className="text-[var(--text-muted)]">{label}:</span>{" "}
      <strong
        style={color ? { color } : undefined}
        className="text-[var(--text-primary)]"
      >
        {value}
      </strong>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/file-connector/SchemaTab.tsx
git commit -m "feat: add SchemaTab with column browser and type badges"
```

---

### Task 7: Stub remaining tabs + wire list page navigation

**Files:**

- Create: `src/components/admin/file-connector/QueryBuilderTab.tsx` (stub)
- Create: `src/components/admin/file-connector/PreviewTab.tsx` (stub)
- Create: `src/components/admin/file-connector/SavedQueriesTab.tsx` (stub)
- Modify: `src/app/admin/connectors/file/page.tsx` (add navigation)

- [ ] **Step 1: Create QueryBuilderTab stub**

```tsx
// src/components/admin/file-connector/QueryBuilderTab.tsx
"use client";

import type { SchemaColumn, QueryPipeline } from "./types";

interface QueryBuilderTabProps {
  schema: SchemaColumn[];
  pipeline: QueryPipeline;
  onPipelineChange: (pipeline: QueryPipeline) => void;
  onRunPreview: () => void;
}

export function QueryBuilderTab({
  schema,
  pipeline,
  onPipelineChange,
  onRunPreview,
}: QueryBuilderTabProps) {
  return (
    <div className="p-5">
      <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
        Query Builder
      </div>
      <div className="text-[12px] text-[var(--text-muted)] mb-4">
        Build a query pipeline: SELECT → WHERE → GROUP BY → HAVING → ORDER BY →
        LIMIT
      </div>

      {/* SELECT: column checkboxes */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 mb-4">
        <div className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">
          SELECT Columns
        </div>
        <div className="flex flex-wrap gap-2">
          {schema.map((col) => {
            const selected = pipeline.select.includes(col.name);
            return (
              <button
                key={col.name}
                onClick={() => {
                  const next = selected
                    ? pipeline.select.filter((c) => c !== col.name)
                    : [...pipeline.select, col.name];
                  onPipelineChange({ ...pipeline, select: next });
                }}
                className={`px-2.5 py-1 rounded-[var(--radius-md)] text-[11px] font-medium transition-colors ${
                  selected
                    ? "bg-[var(--brand-subtle)] text-[var(--brand)] border border-[var(--brand)]"
                    : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]"
                }`}
              >
                {selected ? "\u2713 " : ""}
                {col.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Placeholder for remaining steps */}
      <div className="text-[12px] text-[var(--text-muted)] italic mb-4">
        WHERE, GROUP BY, HAVING, ORDER BY, LIMIT steps coming in Phase 3.
      </div>

      <button
        onClick={onRunPreview}
        className="bg-[var(--brand)] text-[var(--brand-text)] px-5 py-2 rounded-[var(--radius-md)] text-[13px] font-medium hover:opacity-90"
      >
        Run Preview →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create PreviewTab stub**

```tsx
// src/components/admin/file-connector/PreviewTab.tsx
"use client";

import type { QueryPipeline } from "./types";

interface PreviewTabProps {
  data: {
    headers: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    totalSourceRows: number;
    durationMs: number;
  } | null;
  pipeline: QueryPipeline;
}

export function PreviewTab({ data, pipeline }: PreviewTabProps) {
  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-[14px] font-medium text-[var(--text-primary)] mb-1">
          No preview yet
        </div>
        <div className="text-[12px] text-[var(--text-muted)]">
          Go to the Query Builder tab and click "Run Preview" to see results
          here.
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Execution info */}
      <div className="flex items-center gap-3 mb-4 text-[12px]">
        <span className="bg-[var(--success-subtle)] text-[var(--success)] px-2 py-0.5 rounded-[var(--radius-md)]">
          Completed in {data.durationMs}ms
        </span>
        <span className="text-[var(--text-muted)]">
          {data.rowCount} rows from {data.totalSourceRows} source rows
        </span>
        {pipeline.select.length > 0 && (
          <span className="text-[var(--text-muted)]">
            {pipeline.select.length} columns selected
          </span>
        )}
      </div>

      {/* Data table */}
      <div className="border border-[var(--border)] rounded-[var(--radius-md)] overflow-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border)]">
              {data.headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 100).map((row, i) => (
              <tr
                key={i}
                className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                {data.headers.map((h) => (
                  <td
                    key={h}
                    className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap"
                  >
                    {String(row[h] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create SavedQueriesTab stub**

```tsx
// src/components/admin/file-connector/SavedQueriesTab.tsx
"use client";

import type { FileSourceConfig, QueryPipeline } from "./types";

interface SavedQueriesTabProps {
  sourceId: string;
  source: FileSourceConfig;
  pipeline: QueryPipeline;
}

export function SavedQueriesTab({
  sourceId,
  source,
  pipeline,
}: SavedQueriesTabProps) {
  return (
    <div className="p-5">
      <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
        Saved Queries
      </div>
      <div className="text-[12px] text-[var(--text-muted)]">
        Save and publish query configurations for "{source.name}". Full
        implementation coming in Phase 4.
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add navigation link from list page**

Read `src/app/admin/connectors/file/page.tsx`. Find where source cards/rows are rendered. Add an `onClick` or link that navigates to `/admin/connectors/file/{sourceId}`:

Add `import { useRouter } from "next/navigation";` and add click handler to each source card:

```tsx
onClick={() => router.push(`/admin/connectors/file/${source.name}`)}
className="cursor-pointer"
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/file-connector/ src/app/admin/connectors/file/
git commit -m "feat: add stub tabs and list page navigation for file connector detail"
```

---

## Summary

| Phase            | Tasks     | Description                                                                  |
| ---------------- | --------- | ---------------------------------------------------------------------------- |
| Phase 1          | Tasks 1-3 | Types + backend API (pipeline execution, validate, schema, CRUD, publish)    |
| Phase 2          | Tasks 4-7 | Frontend detail page shell, File Info tab, Schema tab, stub tabs, navigation |
| Phase 3 (future) | --        | Full query builder (WHERE, GROUP BY, HAVING, ORDER BY, LIMIT step cards)     |
| Phase 4 (future) | --        | Save & publish flow with chart config, filter params, drill-down             |
| Phase 5 (future) | --        | Add to Dashboard modal                                                       |

This plan delivers a **working, navigable detail page** with File Info and Schema tabs fully functional, a basic Query Builder (SELECT columns + Run Preview), and a working Preview tab -- all backed by real API endpoints. The remaining query builder steps and save/publish flow are stubbed for follow-up.
