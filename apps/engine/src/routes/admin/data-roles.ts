import { Router, Request, Response } from "express";
import { promises as fsPromises } from "fs";
import { join } from "path";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit-logger";
import { requirePermission } from "@/middleware/rbac";
import { CONFIG_DIR } from "@/lib/env-config";

const router = Router();

const DATA_ROLES_PATH = join(CONFIG_DIR, "data-roles.json");

interface DataRole {
  id: string;
  label: string;
  description: string;
}

interface DataRolesFile {
  roles: DataRole[];
}

async function readRoles(): Promise<DataRolesFile> {
  try {
    const raw = await fsPromises.readFile(DATA_ROLES_PATH, "utf-8");
    return JSON.parse(raw) as DataRolesFile;
  } catch {
    return { roles: [] };
  }
}

async function writeRoles(data: DataRolesFile): Promise<void> {
  await fsPromises.writeFile(
    DATA_ROLES_PATH,
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

// GET /api/admin/data-roles — list all available data-access roles
router.get(
  "/",
  requirePermission("settings.read"),
  async (_req: Request, res: Response) => {
    try {
      const data = await readRoles();
      return res.json(data);
    } catch (error) {
      logger.error({ error }, "Failed to read data roles");
      return res.status(500).json({ roles: [] });
    }
  },
);

// POST /api/admin/data-roles — create a new data-access role
router.post(
  "/",
  requirePermission("settings.update"),
  async (req: Request, res: Response) => {
    try {
      const { id, label, description } = req.body;
      if (!id || !label) {
        return res.status(400).json({ error: "id and label are required" });
      }
      const data = await readRoles();
      if (data.roles.some((r) => r.id === id)) {
        return res
          .status(409)
          .json({ error: `Data role "${id}" already exists` });
      }
      const newRole: DataRole = { id, label, description: description || "" };
      const updated = { roles: [...data.roles, newRole] };
      await writeRoles(updated);
      await logAudit({
        action: "create",
        resource: "data-role",
        resourceId: id,
        details: { ...newRole } as Record<string, unknown>,
        ip: req.ip,
      });
      return res.status(201).json(newRole);
    } catch (error) {
      logger.error({ error }, "Failed to create data role");
      return res.status(500).json({ error: "Failed to create data role" });
    }
  },
);

// PATCH /api/admin/data-roles/:id — update a data-access role
router.patch(
  "/:id",
  requirePermission("settings.update"),
  async (req: Request, res: Response) => {
    try {
      const data = await readRoles();
      const idx = data.roles.findIndex((r) => r.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ error: "Data role not found" });
      }
      const role = { ...data.roles[idx] };
      if (req.body.label !== undefined) role.label = req.body.label;
      if (req.body.description !== undefined)
        role.description = req.body.description;
      const updated = {
        roles: [
          ...data.roles.slice(0, idx),
          role,
          ...data.roles.slice(idx + 1),
        ],
      };
      await writeRoles(updated);
      await logAudit({
        action: "update",
        resource: "data-role",
        resourceId: req.params.id,
        details: req.body,
        ip: req.ip,
      });
      return res.json(role);
    } catch (error) {
      logger.error({ error }, "Failed to update data role");
      return res.status(500).json({ error: "Failed to update data role" });
    }
  },
);

// DELETE /api/admin/data-roles/:id — remove a data-access role
router.delete(
  "/:id",
  requirePermission("settings.update"),
  async (req: Request, res: Response) => {
    try {
      const data = await readRoles();
      const idx = data.roles.findIndex((r) => r.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ error: "Data role not found" });
      }
      const updated = {
        roles: [...data.roles.slice(0, idx), ...data.roles.slice(idx + 1)],
      };
      await writeRoles(updated);
      await logAudit({
        action: "delete",
        resource: "data-role",
        resourceId: req.params.id,
        details: {},
        ip: req.ip,
      });
      return res.json({ success: true, deletedRoleId: req.params.id });
    } catch (error) {
      logger.error({ error }, "Failed to delete data role");
      return res.status(500).json({ error: "Failed to delete data role" });
    }
  },
);

export default router;
