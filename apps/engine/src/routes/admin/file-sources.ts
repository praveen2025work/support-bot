import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import { join, extname, dirname } from "path";
import {
  parseCsv,
  executePipeline,
} from "../../core/api-connector/csv-analyzer";
import { logAudit } from "@/lib/audit-logger";
import { paths } from "@/lib/env-config";
import {
  getAllQueries,
  saveQuery,
  invalidateQueryRegistry,
} from "@/core/catalog/query-registry";
import { invalidateQueryData } from "@/lib/singleton";
import { withFileLock } from "@/lib/file-lock";

const router = Router();

// File sources are file-type query definitions (csv/xlsx/document) drawn from
// the file-based per-group store — never db.json. Draft "builder" queries live
// in their own JSON file (paths.data.fileSourceQueries). Both are
// environment-agnostic: the mock-api db.json is data-only.

const FILE_SOURCE_TYPES = new Set(["csv", "xlsx", "document"]);

type FileSource = ReturnType<typeof getAllQueries>[number];

/** All file-type query definitions across every group. */
function listFileSources(): FileSource[] {
  return getAllQueries().filter((q) => FILE_SOURCE_TYPES.has(q.type));
}

/** Find a file source by id or name across all groups. */
function findFileSource(idOrName: string): FileSource | null {
  return (
    listFileSources().find((q) => q.id === idOrName || q.name === idOrName) ??
    null
  );
}

// ── Draft file-source queries (flat JSON store, keyed by sourceId) ──
async function readDraftQueries(): Promise<Array<Record<string, unknown>>> {
  try {
    const raw = await fs.readFile(paths.data.fileSourceQueries, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.queries) ? parsed.queries : [];
  } catch {
    return []; // missing file → no drafts yet
  }
}

async function writeDraftQueries(
  queries: Array<Record<string, unknown>>,
): Promise<void> {
  await fs.mkdir(dirname(paths.data.fileSourceQueries), { recursive: true });
  await fs.writeFile(
    paths.data.fileSourceQueries,
    JSON.stringify({ queries }, null, 2),
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

// ── GET / — List all file sources (file-type queries across groups) ──
router.get("/", async (_req: Request, res: Response) => {
  try {
    const sources = listFileSources();
    return res.json({ sources, total: sources.length });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── GET /:id — Get single file source ──
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const source = findFileSource(req.params.id);
    if (!source) return res.status(404).json({ error: "Source not found" });
    return res.json(source);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── POST /:id/validate — Validate file exists and is parseable ──
router.post("/:id/validate", async (req: Request, res: Response) => {
  try {
    const source = findFileSource(req.params.id);
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
    const source = findFileSource(req.params.id);
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
    const source = findFileSource(req.params.id);
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

// ── GET /:id/queries — List saved (draft) queries for this source ──
router.get("/:id/queries", async (req: Request, res: Response) => {
  try {
    const drafts = await readDraftQueries();
    const sourceQueries = drafts.filter((q) => q.sourceId === req.params.id);
    return res.json({ queries: sourceQueries });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── POST /:id/queries — Save a new draft query ──
router.post("/:id/queries", async (req: Request, res: Response) => {
  try {
    const drafts = await readDraftQueries();
    const id = `fsq-${Date.now()}`;
    const newQuery = {
      id,
      sourceId: req.params.id,
      ...req.body,
      status: req.body.status ?? "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeDraftQueries([...drafts, newQuery]);

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

// ── PUT /:id/queries/:qid — Update saved draft query ──
router.put("/:id/queries/:qid", async (req: Request, res: Response) => {
  try {
    const drafts = await readDraftQueries();
    const idx = drafts.findIndex((q) => q.id === req.params.qid);
    if (idx === -1) return res.status(404).json({ error: "Query not found" });

    const updated = {
      ...drafts[idx],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    const next = [...drafts];
    next[idx] = updated;
    await writeDraftQueries(next);

    logAudit({
      action: "update",
      resource: "file-source-query",
      resourceId: req.params.qid,
      ip: req.ip,
    });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── DELETE /:id/queries/:qid — Delete saved draft query ──
router.delete("/:id/queries/:qid", async (req: Request, res: Response) => {
  try {
    const drafts = await readDraftQueries();
    const idx = drafts.findIndex((q) => q.id === req.params.qid);
    if (idx === -1) return res.status(404).json({ error: "Query not found" });

    await writeDraftQueries(drafts.filter((q) => q.id !== req.params.qid));

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

// ── POST /:id/queries/:qid/publish — Publish draft query to the catalog ──
router.post(
  "/:id/queries/:qid/publish",
  async (req: Request, res: Response) => {
    try {
      const drafts = await readDraftQueries();
      const draftIdx = drafts.findIndex((q) => q.id === req.params.qid);
      if (draftIdx === -1)
        return res.status(404).json({ error: "Query not found" });
      const draft = drafts[draftIdx];

      const source = findFileSource(req.params.id);
      if (!source) return res.status(404).json({ error: "Source not found" });

      // Publish into the source's group per-group file (file-based catalog),
      // under the per-group write lock so concurrent publishes can't clobber
      // each other. Note: `pipeline` is a transient execution param (sent per
      // request to /preview), not a stored catalog field — QuerySchema omits
      // it, so it is intentionally not persisted here.
      const published = await withFileLock(
        paths.data.queries(source.groupId),
        async () =>
          saveQuery(source.groupId, {
            name: draft.name as string,
            description: (draft.description as string) ?? "",
            type: source.type,
            filePath: source.filePath,
            fileBaseDir: source.fileBaseDir,
            sheetName: source.sheetName,
            source:
              (draft.displayGroup as string) ?? source.source ?? "default",
            filters: (
              (draft.filterParams as Array<Record<string, unknown>>) ?? []
            ).map((fp) => ({
              key: fp.column as string,
              binding: (fp.binding as string) ?? "column",
            })),
            chartConfig: draft.chartConfig,
            columnConfig: source.columnConfig,
            drillDown: draft.drillDown,
          }),
      );

      const next = [...drafts];
      next[draftIdx] = { ...draft, status: "published" };
      await writeDraftQueries(next);
      invalidateQueryRegistry(source.groupId);
      invalidateQueryData();

      logAudit({
        action: "publish",
        resource: "file-source-query",
        resourceId: req.params.qid,
        ip: req.ip,
      });
      return res.json({ success: true, query: published });
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  },
);

export default router;
