/**
 * Business glossary admin CRUD.
 *
 *   GET    /api/admin/glossary?groupId=<id>          — list entries
 *   POST   /api/admin/glossary                       — upsert one
 *     body: { groupId, id?, name, aliases, definition, formula?, owner?, examples?, updatedBy? }
 *   DELETE /api/admin/glossary?groupId=<id>&id=<id>  — delete one
 *
 * All endpoints gate on `intents.manage` — same bar as the synonyms
 * editor since glossary entries feed the same operator-driven
 * understanding layer.
 */

import { Router, Request, Response } from "express";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit-logger";
import { requirePermission } from "@/middleware/rbac";
import {
  readGlossary,
  upsertEntry,
  deleteEntry,
} from "@/core/glossary/registry";

const router = Router();

router.get(
  "/",
  requirePermission("intents.manage"),
  async (req: Request, res: Response) => {
    const groupId =
      typeof req.query.groupId === "string" ? req.query.groupId : "default";
    try {
      const file = await readGlossary(groupId);
      return res.json(file);
    } catch (err) {
      logger.error({ err, groupId }, "glossary route: GET failed");
      return res.status(500).json({ error: "Failed to load glossary" });
    }
  },
);

router.post(
  "/",
  requirePermission("intents.manage"),
  async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const groupId = typeof body.groupId === "string" ? body.groupId : null;
    if (!groupId) {
      return res.status(400).json({ error: "groupId is required" });
    }
    if (
      typeof body.name !== "string" ||
      typeof body.definition !== "string" ||
      !body.name.trim() ||
      !body.definition.trim()
    ) {
      return res
        .status(400)
        .json({ error: "name (string) and definition (string) are required" });
    }
    try {
      const entry = await upsertEntry(groupId, {
        id: typeof body.id === "string" ? body.id : "",
        name: body.name.trim(),
        aliases: Array.isArray(body.aliases)
          ? body.aliases.filter((a: unknown) => typeof a === "string")
          : [],
        definition: body.definition.trim(),
        formula: typeof body.formula === "string" ? body.formula : undefined,
        owner: typeof body.owner === "string" ? body.owner : undefined,
        examples: Array.isArray(body.examples)
          ? body.examples.filter((e: unknown) => typeof e === "string")
          : undefined,
        updatedBy:
          typeof body.updatedBy === "string" ? body.updatedBy : undefined,
      });
      await logAudit({
        action: "update",
        resource: "glossary",
        resourceId: entry.id,
        groupId,
        userId: entry.updatedBy,
        details: {
          name: entry.name,
          aliasCount: entry.aliases.length,
        },
        ip: req.ip,
      });
      return res.json({ success: true, entry });
    } catch (err) {
      logger.error({ err, groupId }, "glossary route: POST failed");
      return res.status(500).json({ error: "Failed to save glossary entry" });
    }
  },
);

router.delete(
  "/",
  requirePermission("intents.manage"),
  async (req: Request, res: Response) => {
    const groupId =
      typeof req.query.groupId === "string" ? req.query.groupId : null;
    const id = typeof req.query.id === "string" ? req.query.id : null;
    if (!groupId || !id) {
      return res
        .status(400)
        .json({ error: "groupId and id query params are required" });
    }
    try {
      const ok = await deleteEntry(groupId, id);
      if (!ok) {
        return res.status(404).json({ error: "Glossary entry not found" });
      }
      await logAudit({
        action: "delete",
        resource: "glossary",
        resourceId: id,
        groupId,
        ip: req.ip,
      });
      return res.json({ success: true, deleted: id });
    } catch (err) {
      logger.error({ err, groupId, id }, "glossary route: DELETE failed");
      return res.status(500).json({ error: "Failed to delete entry" });
    }
  },
);

export default router;
