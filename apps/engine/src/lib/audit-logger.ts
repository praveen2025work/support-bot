import { promises as fs } from "fs";
import { logger } from "./logger";
import { paths } from "./env-config";
import { appendRotatingJsonl } from "./rotating-jsonl";

export interface AuditEntry {
  timestamp: string;
  action:
    | "create"
    | "read" // forensic read of sensitive data (e.g. clear-text PII view)
    | "update"
    | "delete"
    | "upload"
    | "refresh"
    | "execute" // chat-side: user ran a query (incl. forceIntent)
    | "publish";
  resource: string; // e.g., 'query', 'group', 'filter', 'template', 'user', 'settings', 'file', 'intent', 'chat'
  resourceId?: string;
  groupId?: string;
  userId?: string; // who made the change
  details?: Record<string, unknown>; // what changed
  ip?: string;
}

const AUDIT_DIR = paths.data.auditDir;
const AUDIT_FILE = paths.data.auditFile;

async function ensureAuditDir() {
  await fs.mkdir(AUDIT_DIR, { recursive: true });
}

export async function logAudit(
  entry: Omit<AuditEntry, "timestamp">,
): Promise<void> {
  try {
    await ensureAuditDir();
    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    // Append via the rotating writer so audit.jsonl can never grow
    // past ~10MB without rotating to audit.<timestamp>.jsonl. Audit
    // entries are small (~200 bytes each) so 10MB ≈ 50k entries —
    // plenty for a single retention window, but bounded.
    await appendRotatingJsonl(AUDIT_FILE, JSON.stringify(fullEntry));
    logger.info({ audit: fullEntry }, "Audit log entry");
  } catch (err) {
    logger.error({ err }, "Failed to write audit log");
  }
}

export async function getAuditLog(options?: {
  resource?: string;
  groupId?: string;
  limit?: number;
  since?: string;
}): Promise<AuditEntry[]> {
  try {
    await ensureAuditDir();
    const content = await fs.readFile(AUDIT_FILE, "utf-8");
    let entries = content
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEntry);

    if (options?.resource)
      entries = entries.filter((e) => e.resource === options.resource);
    if (options?.groupId)
      entries = entries.filter((e) => e.groupId === options.groupId);
    if (options?.since) {
      const since = options.since;
      entries = entries.filter((e) => e.timestamp >= since);
    }

    entries.reverse(); // newest first
    if (options?.limit) entries = entries.slice(0, options.limit);
    return entries;
  } catch {
    return [];
  }
}
