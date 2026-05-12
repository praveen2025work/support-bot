/**
 * Shareable view snapshots.
 *
 * The user has a chat result in front of them, wants to send it to a
 * colleague. We snapshot the LAST bot response from their session +
 * minimal metadata (queryName, follow-up trail, group, who, when),
 * persist under data/views/<id>.json, and return a short id the UI
 * can use to build a share URL.
 *
 * Recipient opens /share/<id>, the Next.js page fetches the snapshot
 * via GET /api/views/<id>, and renders the rich content as it was at
 * snapshot time.
 *
 * Public access for v1 (anyone with the link can view). RBAC + signed
 * URLs land before production; for the CIO demo and pilot, "share the
 * link" is the entire mental model.
 *
 * Storage layout: one JSON file per snapshot, identified by a short
 * random id (8 url-safe chars). Cleanup is left to the existing
 * data-dir hygiene story (manual prune) — TTL sweep is a follow-up.
 */

import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";
import { paths } from "@/lib/env-config";
import { logAudit } from "@/lib/audit-logger";

export const viewsRouter = Router();

interface ViewSnapshot {
  id: string;
  createdAt: string;
  createdBy?: string;
  groupId: string;
  queryName?: string;
  followUpChain?: Array<{ operation: string; text: string }>;
  text: string;
  richContent?: { type: string; data: unknown };
  intent?: string;
  confidence?: number;
  /** SHA-256 of the snapshot payload, so the share URL is content-addressable
   *  for trust signals (UI can render "tampered" if hash mismatches). v1
   *  doesn't enforce this, but ship the field so we don't break clients
   *  when we do. */
  contentHash?: string;
}

/** Short, URL-safe id. ~48 bits of entropy is plenty for non-secret
 *  shareable links. */
function generateViewId(): string {
  return randomBytes(6).toString("base64url");
}

async function readSnapshot(id: string): Promise<ViewSnapshot | null> {
  try {
    const raw = await fs.readFile(paths.data.viewFile(id), "utf-8");
    return JSON.parse(raw) as ViewSnapshot;
  } catch (err) {
    if ((err as { code?: string }).code === "ENOENT") return null;
    throw err;
  }
}

async function writeSnapshot(snapshot: ViewSnapshot): Promise<void> {
  await fs.mkdir(paths.data.viewsDir, { recursive: true });
  await fs.writeFile(
    paths.data.viewFile(snapshot.id),
    JSON.stringify(snapshot, null, 2),
    "utf-8",
  );
}

/**
 * POST /api/views/snapshot
 *
 * Body: { sessionId, groupId, message: { text, richContent?, intent?, ... },
 *         queryName?, followUpChain?, userId? }
 *
 * The chat route is the only natural caller — it has the message in
 * hand right after engine.processMessage returns. Storing here is a
 * fire-and-forget convenience that lets the UI render a "Share" button
 * without each frontend re-implementing the snapshot logic.
 */
viewsRouter.post("/snapshot", async (req: Request, res: Response) => {
  try {
    const { sessionId, groupId, message, queryName, followUpChain, userId } =
      req.body ?? {};

    if (!message || typeof message.text !== "string") {
      return res.status(400).json({
        error: "Body must include a message object with at least a text field",
      });
    }
    if (typeof groupId !== "string" || !groupId) {
      return res.status(400).json({ error: "groupId is required" });
    }

    const id = generateViewId();
    const snapshot: ViewSnapshot = {
      id,
      createdAt: new Date().toISOString(),
      createdBy: typeof userId === "string" ? userId : undefined,
      groupId,
      queryName: typeof queryName === "string" ? queryName : undefined,
      followUpChain: Array.isArray(followUpChain) ? followUpChain : undefined,
      text: message.text,
      richContent: message.richContent,
      intent: typeof message.intent === "string" ? message.intent : undefined,
      confidence:
        typeof message.confidence === "number" ? message.confidence : undefined,
    };

    await writeSnapshot(snapshot);

    // Audit every snapshot — useful for "who shared what" forensics
    // and for compliance teams asking about PII exfiltration vectors.
    await logAudit({
      action: "create",
      resource: "view-snapshot",
      resourceId: id,
      groupId,
      userId: snapshot.createdBy,
      details: { queryName: snapshot.queryName, sessionId },
      ip: req.ip,
    });

    logger.info(
      { id, groupId, queryName: snapshot.queryName },
      "View snapshot created",
    );
    return res.status(201).json({ id, url: `/share/${id}` });
  } catch (err) {
    logger.error({ err }, "Failed to create view snapshot");
    return res.status(500).json({ error: "Failed to create snapshot" });
  }
});

/**
 * GET /api/views/:id — fetch a snapshot by id.
 *
 * Public for v1. The id has ~48 bits of entropy so it isn't guessable,
 * but anyone with the link can view. Hardening (signed URLs, per-tenant
 * tokens, expiry) is on the roadmap.
 */
viewsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    // Defensive: reject ids that aren't shaped like our generator output
    // to prevent path traversal via the file-read.
    if (!/^[A-Za-z0-9_-]{6,16}$/.test(id)) {
      return res.status(400).json({ error: "Invalid view id" });
    }
    const snapshot = await readSnapshot(id);
    if (!snapshot) {
      return res.status(404).json({ error: "View not found" });
    }
    return res.json(snapshot);
  } catch (err) {
    logger.error({ err }, "Failed to fetch view snapshot");
    return res.status(500).json({ error: "Failed to fetch snapshot" });
  }
});
