import { Router, Request, Response } from "express";
import { promises as fsPromises } from "fs";
import { join } from "path";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit-logger";
import { requirePermission } from "@/middleware/rbac";
import type { FilterSource } from "@/config/filter-options";

const router = Router();

import { paths } from "@/lib/env-config";

const FILTER_CONFIG_PATH = paths.config.filterConfig;

/* ------------------------------------------------------------------ */
/*  Helper: fetch filter options from an API endpoint                  */
/*                                                                     */
/*  Expected response shapes (standard contract):                      */
/*    A) [{ "value": "US", "label": "United States" }, ...]            */
/*    B) ["US", "EU", "APAC"]   (plain strings)                       */
/*    C) Nested: { "data": { "items": [...] } }                       */
/*       → configure valuePath, valueField, labelField                 */
/* ------------------------------------------------------------------ */
async function fetchFilterOptions(
  source: FilterSource,
): Promise<{ value: string; label: string }[]> {
  const res = await fetch(source.url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API returned ${res.status}: ${text}`);
  }
  let data: unknown = await res.json();
  if (source.valuePath) {
    for (const seg of source.valuePath.split(".")) {
      data = (data as Record<string, unknown>)?.[seg];
    }
  }
  if (!Array.isArray(data)) return [];
  // Handle plain string arrays: ["US", "EU"]
  if (data.length > 0 && typeof data[0] === "string") {
    return data.map((v) => ({ value: v as string, label: v as string }));
  }
  const vf = source.valueField || "value";
  const lf = source.labelField || "label";
  return data.map((item: Record<string, unknown>) => ({
    value: String(item[vf] ?? ""),
    label: String(item[lf] ?? item[vf] ?? ""),
  }));
}

router.get(
  "/",
  requirePermission("filters.manage"),
  async (_req: Request, res: Response) => {
    try {
      const raw = await fsPromises.readFile(FILTER_CONFIG_PATH, "utf-8");
      return res.json(JSON.parse(raw));
    } catch {
      return res.json({ filters: {} });
    }
  },
);

router.post(
  "/",
  requirePermission("filters.manage"),
  async (req: Request, res: Response) => {
    try {
      const {
        key,
        label,
        type,
        options,
        placeholder,
        dateFormat,
        source,
        presets,
        numberConfig,
        debounceMs,
      } = req.body;
      if (!key || !label || !type)
        return res
          .status(400)
          .json({ error: "key, label, and type are required" });
      const typesWithOptions = ["select", "multi_select"];
      const typesWithPlaceholder = ["text", "search"];
      const raw = await fsPromises.readFile(FILTER_CONFIG_PATH, "utf-8");
      const data = JSON.parse(raw);
      data.filters[key] = {
        label,
        type,
        options: typesWithOptions.includes(type) ? options || [] : [],
        placeholder: typesWithPlaceholder.includes(type)
          ? placeholder || `Enter ${key}...`
          : null,
        ...(dateFormat ? { dateFormat } : {}),
        ...(source ? { source } : {}),
        ...(presets && Array.isArray(presets) && presets.length > 0
          ? { presets }
          : {}),
        ...(numberConfig && typeof numberConfig === "object"
          ? { numberConfig }
          : {}),
        ...(typeof debounceMs === "number" ? { debounceMs } : {}),
      };
      await fsPromises.writeFile(
        FILTER_CONFIG_PATH,
        JSON.stringify(data, null, 2),
        "utf-8",
      );
      await logAudit({
        action: "create",
        resource: "filter",
        resourceId: key,
        details: { label, type },
        ip: req.ip,
      });
      return res.json({ key, ...data.filters[key] });
    } catch (error) {
      logger.error({ error }, "Failed to save filter config");
      return res.status(500).json({ error: "Failed to save filter config" });
    }
  },
);

router.delete(
  "/",
  requirePermission("filters.manage"),
  async (req: Request, res: Response) => {
    try {
      const key = req.query.key as string;
      if (!key)
        return res.status(400).json({ error: "key query param is required" });
      const raw = await fsPromises.readFile(FILTER_CONFIG_PATH, "utf-8");
      const data = JSON.parse(raw);
      if (!data.filters[key])
        return res.status(404).json({ error: "Filter not found" });
      delete data.filters[key];
      await fsPromises.writeFile(
        FILTER_CONFIG_PATH,
        JSON.stringify(data, null, 2),
        "utf-8",
      );
      await logAudit({
        action: "delete",
        resource: "filter",
        resourceId: key,
        ip: req.ip,
      });
      return res.json({ success: true, deletedKey: key });
    } catch (error) {
      logger.error({ error }, "Failed to delete filter config");
      return res.status(500).json({ error: "Failed to delete filter config" });
    }
  },
);

/* ------------------------------------------------------------------ */
/*  POST /refresh — refresh dynamic filter options from API source     */
/* ------------------------------------------------------------------ */
router.post(
  "/refresh",
  requirePermission("filters.manage"),
  async (req: Request, res: Response) => {
    try {
      const { key } = req.body as { key?: string };
      const raw = await fsPromises.readFile(FILTER_CONFIG_PATH, "utf-8");
      const data = JSON.parse(raw);
      const filters = data.filters as Record<string, Record<string, unknown>>;

      const keysToRefresh = key
        ? [key]
        : Object.keys(filters).filter((k) => filters[k].source);

      if (key && !filters[key]) {
        return res.status(404).json({ error: `Filter "${key}" not found` });
      }
      if (key && !filters[key].source) {
        return res
          .status(400)
          .json({ error: `Filter "${key}" has no dynamic source configured` });
      }

      const refreshed: string[] = [];
      const errors: Record<string, string> = {};

      for (const k of keysToRefresh) {
        const source = filters[k].source as FilterSource;
        if (!source || !source.url) continue;
        try {
          const options = await fetchFilterOptions(source);
          filters[k].options = options;
          (filters[k].source as Record<string, unknown>).lastRefreshed =
            new Date().toISOString();
          refreshed.push(k);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error(
            { error: err, filterKey: k },
            "Failed to refresh filter options",
          );
          errors[k] = msg;
        }
      }

      await fsPromises.writeFile(
        FILTER_CONFIG_PATH,
        JSON.stringify(data, null, 2),
        "utf-8",
      );
      await logAudit({
        action: "refresh",
        resource: "filter",
        resourceId: key || "__all__",
        details: { refreshed, errors },
        ip: req.ip,
      });

      return res.json({ refreshed, errors, filters: data.filters });
    } catch (error) {
      logger.error({ error }, "Failed to refresh filter options");
      return res
        .status(500)
        .json({ error: "Failed to refresh filter options" });
    }
  },
);

export default router;
