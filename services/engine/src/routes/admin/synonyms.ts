/**
 * Per-group synonym admin CRUD.
 *
 * Storage: `paths.data.synonymsFile(groupId)` →
 *   services/engine/data/learning/<groupId>/synonyms.json
 *
 * Schema: an array of `{ canonical: string; synonyms: string[]; updatedAt: string; updatedBy?: string }`.
 *
 * Every mutation logs an audit entry (resource: 'synonym') and clears the
 * in-memory per-group synonym cache so the next NLP call picks up the change.
 *
 * Auth: `requirePermission('intents.manage')` — same bar as the static intents
 * editor, since synonyms feed into the same NLP pipeline.
 */

import { Router, Request, Response } from "express";
import { promises as fsPromises, existsSync } from "fs";
import { dirname } from "path";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit-logger";
import { requirePermission } from "@/middleware/rbac";
import { paths } from "@/lib/env-config";
import {
  clearGroupSynonymsCache,
  type GroupSynonymEntry,
} from "@/core/nlp/synonym-expander";

const router = Router({ mergeParams: true });

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function isGroupSynonymEntry(value: unknown): value is GroupSynonymEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.canonical === "string" &&
    Array.isArray(v.synonyms) &&
    v.synonyms.every((s) => typeof s === "string") &&
    typeof v.updatedAt === "string"
  );
}

async function readSynonyms(groupId: string): Promise<GroupSynonymEntry[]> {
  const filePath = paths.data.synonymsFile(groupId);
  if (!existsSync(filePath)) return [];
  try {
    const raw = await fsPromises.readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      logger.warn(
        { groupId, filePath },
        "synonyms route: stored synonyms file is not an array",
      );
      return [];
    }
    return parsed.filter(isGroupSynonymEntry) as GroupSynonymEntry[];
  } catch (err) {
    logger.warn(
      { err, groupId, filePath },
      "synonyms route: failed to read per-group synonyms",
    );
    return [];
  }
}

async function writeSynonyms(
  groupId: string,
  entries: GroupSynonymEntry[],
): Promise<void> {
  const filePath = paths.data.synonymsFile(groupId);
  await fsPromises.mkdir(dirname(filePath), { recursive: true });
  await fsPromises.writeFile(
    filePath,
    JSON.stringify(entries, null, 2) + "\n",
    "utf-8",
  );
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const CANONICAL_PATTERN = /^[A-Za-z0-9_\- .]+$/;
const MAX_CANONICAL_LEN = 80;
const MAX_SYNONYM_LEN = 80;
const MAX_SYNONYMS_PER_ENTRY = 50;

interface ValidationError {
  ok: false;
  status: number;
  message: string;
}
interface ValidationOk {
  ok: true;
  canonical: string;
  synonyms: string[];
}
type Validation = ValidationError | ValidationOk;

function validateUpsertBody(body: unknown): Validation {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, message: "request body required" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.canonical !== "string" || !b.canonical.trim()) {
    return {
      ok: false,
      status: 400,
      message: "canonical (non-empty string) is required",
    };
  }
  const canonical = b.canonical.trim().toLowerCase();
  if (canonical.length > MAX_CANONICAL_LEN) {
    return {
      ok: false,
      status: 400,
      message: `canonical exceeds ${MAX_CANONICAL_LEN} chars`,
    };
  }
  if (!CANONICAL_PATTERN.test(canonical)) {
    return {
      ok: false,
      status: 400,
      message:
        "canonical contains invalid characters (allowed: letters, digits, _ - . space)",
    };
  }
  if (!Array.isArray(b.synonyms)) {
    return {
      ok: false,
      status: 400,
      message: "synonyms[] is required",
    };
  }
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const raw of b.synonyms) {
    if (typeof raw !== "string") {
      return {
        ok: false,
        status: 400,
        message: "every synonym must be a string",
      };
    }
    const s = raw.trim().toLowerCase();
    if (!s) continue;
    if (s.length > MAX_SYNONYM_LEN) {
      return {
        ok: false,
        status: 400,
        message: `synonym "${s}" exceeds ${MAX_SYNONYM_LEN} chars`,
      };
    }
    if (s === canonical || seen.has(s)) continue;
    seen.add(s);
    cleaned.push(s);
  }
  if (cleaned.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "at least one non-empty synonym is required",
    };
  }
  if (cleaned.length > MAX_SYNONYMS_PER_ENTRY) {
    return {
      ok: false,
      status: 400,
      message: `too many synonyms (max ${MAX_SYNONYMS_PER_ENTRY})`,
    };
  }
  return { ok: true, canonical, synonyms: cleaned };
}

function getActorUserId(req: Request): string | undefined {
  const headerUser = req.headers["x-user-id"];
  if (typeof headerUser === "string" && headerUser.trim()) {
    return headerUser.trim();
  }
  const headerEmail = req.headers["x-user-email"];
  if (typeof headerEmail === "string" && headerEmail.trim()) {
    return headerEmail.trim();
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/groups/:groupId/synonyms
 * List all synonym entries for a group.
 */
router.get(
  "/",
  requirePermission("intents.manage"),
  async (req: Request, res: Response) => {
    const groupId = (req.params as { groupId?: string }).groupId;
    if (!groupId) {
      return res.status(400).json({ error: "groupId path param is required" });
    }
    try {
      const synonyms = await readSynonyms(groupId);
      return res.json({ groupId, synonyms });
    } catch (err) {
      logger.error({ err, groupId }, "synonyms route: GET failed");
      return res
        .status(500)
        .json({ error: "Failed to load per-group synonyms" });
    }
  },
);

/**
 * POST /api/admin/groups/:groupId/synonyms
 * Body: { canonical: string; synonyms: string[] }
 * Creates a new entry or updates the existing one (matched by canonical).
 */
router.post(
  "/",
  requirePermission("intents.manage"),
  async (req: Request, res: Response) => {
    const groupId = (req.params as { groupId?: string }).groupId;
    if (!groupId) {
      return res.status(400).json({ error: "groupId path param is required" });
    }
    const validation = validateUpsertBody(req.body);
    if (!validation.ok) {
      return res.status(validation.status).json({ error: validation.message });
    }
    try {
      const { canonical, synonyms } = validation;
      const existing = await readSynonyms(groupId);
      const idx = existing.findIndex((e) => e.canonical === canonical);
      const isUpdate = idx >= 0;
      const updatedBy = getActorUserId(req);
      const entry: GroupSynonymEntry = {
        canonical,
        synonyms,
        updatedAt: new Date().toISOString(),
        ...(updatedBy ? { updatedBy } : {}),
      };
      const next = isUpdate
        ? existing.map((e, i) => (i === idx ? entry : e))
        : [...existing, entry];
      await writeSynonyms(groupId, next);
      clearGroupSynonymsCache(groupId);
      await logAudit({
        action: isUpdate ? "update" : "create",
        resource: "synonym",
        resourceId: `${groupId}:${canonical}`,
        groupId,
        userId: updatedBy,
        details: { canonical, synonymCount: synonyms.length },
        ip: req.ip,
      });
      return res.json({ success: true, entry });
    } catch (err) {
      logger.error(
        { err, groupId },
        "synonyms route: POST failed to persist entry",
      );
      return res.status(500).json({ error: "Failed to save synonym entry" });
    }
  },
);

/**
 * DELETE /api/admin/groups/:groupId/synonyms?canonical=<term>
 * Removes the entry for the given canonical term.
 */
router.delete(
  "/",
  requirePermission("intents.manage"),
  async (req: Request, res: Response) => {
    const groupId = (req.params as { groupId?: string }).groupId;
    if (!groupId) {
      return res.status(400).json({ error: "groupId path param is required" });
    }
    const canonicalRaw = req.query.canonical;
    if (typeof canonicalRaw !== "string" || !canonicalRaw.trim()) {
      return res
        .status(400)
        .json({ error: "canonical query param is required" });
    }
    const canonical = canonicalRaw.trim().toLowerCase();
    try {
      const existing = await readSynonyms(groupId);
      const idx = existing.findIndex((e) => e.canonical === canonical);
      if (idx < 0) {
        return res
          .status(404)
          .json({
            error: `No synonym entry found for canonical "${canonical}"`,
          });
      }
      const next = existing.filter((_, i) => i !== idx);
      await writeSynonyms(groupId, next);
      clearGroupSynonymsCache(groupId);
      await logAudit({
        action: "delete",
        resource: "synonym",
        resourceId: `${groupId}:${canonical}`,
        groupId,
        userId: getActorUserId(req),
        details: { canonical },
        ip: req.ip,
      });
      return res.json({ success: true, deleted: canonical });
    } catch (err) {
      logger.error(
        { err, groupId, canonical },
        "synonyms route: DELETE failed",
      );
      return res.status(500).json({ error: "Failed to delete synonym entry" });
    }
  },
);

export default router;
export const synonymsRouter = router;
