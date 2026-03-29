import { promises as fs } from "fs";
import { join } from "path";
import type {
  FileConnectorConfig,
  FileConnectionStatus,
  FileColumnInfo,
  FileQueryResult,
  QueryPipeline,
} from "./types";

// Lazy-load XLSX (~700KB)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _xlsx: any = null;
function getXLSX() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (!_xlsx) _xlsx = require("xlsx");
  return _xlsx;
}

interface ParsedData {
  headers: string[];
  rows: Record<string, string | number>[];
}

import { existsSync } from "fs";

const PROJECT_ROOT = process.env.PROJECT_ROOT || join(process.cwd(), "../..");
const ENGINE_DATA_DIR = join(process.cwd(), "../engine");

export function resolveFilePath(
  filePath: string,
  fileBaseDir?: string,
): string {
  // 1. Explicit base dir
  if (fileBaseDir) {
    const abs = join(fileBaseDir, filePath);
    if (existsSync(abs)) return abs;
    // Try relative to project root
    const fromRoot = join(PROJECT_ROOT, fileBaseDir, filePath);
    if (existsSync(fromRoot)) return fromRoot;
  }

  // 2. Try from connector cwd
  const fromCwd = join(process.cwd(), filePath);
  if (existsSync(fromCwd)) return fromCwd;

  // 3. Try from engine directory (where data/ files typically live)
  const fromEngine = join(ENGINE_DATA_DIR, filePath);
  if (existsSync(fromEngine)) return fromEngine;

  // 4. Try from project root
  const fromRoot = join(PROJECT_ROOT, filePath);
  if (existsSync(fromRoot)) return fromRoot;

  // Fallback to cwd-based path (will error on read with clear message)
  return fromCwd;
}

export function parseFile(
  content: string | Buffer,
  sheetName?: string,
): ParsedData {
  // Try XLSX first
  try {
    const XLSX = getXLSX();
    const wb = XLSX.read(content, {
      type: Buffer.isBuffer(content) ? "buffer" : "string",
    });
    const wsName = sheetName || wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    if (!ws) throw new Error(`Sheet "${wsName}" not found`);
    const jsonData = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<
      string,
      string | number
    >[];
    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    return { headers, rows: jsonData };
  } catch {
    // Fall back to CSV parsing
    const text = Buffer.isBuffer(content) ? content.toString("utf-8") : content;
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string | number> = {};
      headers.forEach((h, i) => {
        const val = values[i] ?? "";
        const num = Number(val);
        row[h] = val !== "" && !isNaN(num) ? num : val;
      });
      return row;
    });
    return { headers, rows };
  }
}

export async function loadFileData(
  config: FileConnectorConfig,
): Promise<ParsedData> {
  const fullPath = resolveFilePath(config.filePath, config.fileBaseDir);
  const content = await fs.readFile(fullPath);
  return parseFile(content, config.sheetName);
}

export async function testFile(
  config: FileConnectorConfig,
): Promise<FileConnectionStatus> {
  try {
    const fullPath = resolveFilePath(config.filePath, config.fileBaseDir);
    const stat = await fs.stat(fullPath);
    const data = await loadFileData(config);
    return {
      connectorId: config.id,
      connected: true,
      rowCount: data.rows.length,
      columnCount: data.headers.length,
      fileSize: stat.size,
      lastModified: stat.mtime.toISOString(),
      lastChecked: new Date().toISOString(),
    };
  } catch (err) {
    return {
      connectorId: config.id,
      connected: false,
      error: String(err),
      lastChecked: new Date().toISOString(),
    };
  }
}

export function getColumnInfo(data: ParsedData): FileColumnInfo[] {
  return data.headers.map((h) => {
    const values = data.rows.map((r) => r[h]);
    const nonNull = values.filter((v) => v != null && v !== "");
    const distinct = new Set(nonNull.map(String));
    const isNumeric =
      nonNull.length > 0 && nonNull.every((v) => !isNaN(Number(v)));
    const sampleValues = Array.from(distinct).slice(0, 5).map(String);

    return {
      name: h,
      dataType: isNumeric ? ("number" as const) : ("string" as const),
      nullable: values.length > nonNull.length,
      distinctCount: distinct.size,
      nullCount: values.length - nonNull.length,
      sampleValues,
    };
  });
}

// ── Pipeline execution ──────────────────────────────────────────────

export function executePipeline(
  data: ParsedData,
  pipeline: QueryPipeline,
): FileQueryResult {
  const start = Date.now();
  let rows: Record<string, unknown>[] = [...data.rows];
  let headers = pipeline.select?.length
    ? [...pipeline.select]
    : [...data.headers];

  // 1. SELECT
  if (pipeline.select?.length) {
    rows = rows.map((r) => {
      const out: Record<string, unknown> = {};
      for (const col of pipeline.select!) {
        if (col in r) out[col] = r[col];
      }
      return out;
    });
  }

  // 2. WHERE
  if (pipeline.where?.length) {
    rows = rows.filter((row) => evaluateConditions(row, pipeline.where!));
  }

  // 3. GROUP BY
  if (pipeline.groupBy) {
    const { columns: groupCols, aggregations: aggs } = pipeline.groupBy;
    const groups = new Map<string, Record<string, unknown>[]>();
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
      const out: Record<string, unknown> = {};
      for (const gc of groupCols) out[gc] = groupRows[0][gc];
      for (const agg of aggs) {
        const vals = groupRows
          .map((r) => Number(r[agg.column]))
          .filter((v) => !isNaN(v));
        const key = `${agg.operation.toUpperCase()}(${agg.column})`;
        switch (agg.operation) {
          case "sum":
            out[key] = vals.reduce((a, b) => a + b, 0);
            break;
          case "avg":
            out[key] = vals.length
              ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
              : 0;
            break;
          case "min":
            out[key] = vals.length ? Math.min(...vals) : 0;
            break;
          case "max":
            out[key] = vals.length ? Math.max(...vals) : 0;
            break;
          case "count":
            out[key] = groupRows.length;
            break;
        }
      }
      out.count = groupRows.length;
      return out;
    });
  }

  // 4. HAVING
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
  const truncated =
    pipeline.limit && pipeline.limit > 0 && rows.length > pipeline.limit;
  const totalBeforeTruncation = rows.length;
  if (pipeline.limit && pipeline.limit > 0) {
    rows = rows.slice(0, pipeline.limit);
  }

  return {
    columns: headers,
    rows,
    rowCount: rows.length,
    executionMs: Date.now() - start,
    truncated: !!truncated,
    totalRowsBeforeTruncation: totalBeforeTruncation,
    columnCount: headers.length,
  };
}

function evaluateConditions(
  row: Record<string, unknown>,
  conditions: Array<{
    column: string;
    operator: string;
    value: unknown;
    logic?: "and" | "or";
  }>,
): boolean {
  let result = true;
  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];
    const matches = evaluateSingle(row[c.column], c.operator, c.value);
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
  cellVal: unknown,
  operator: string,
  value: unknown,
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
