import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import { join, extname } from "path";
import {
  parseCsv,
  executePipeline,
} from "../../core/api-connector/csv-analyzer";
import { logAudit } from "@/lib/audit-logger";
import { paths } from "@/lib/env-config";

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
