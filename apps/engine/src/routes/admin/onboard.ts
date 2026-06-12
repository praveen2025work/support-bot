import { Router, Request, Response } from "express";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { logger } from "@/lib/logger";
import { requirePermission } from "@/middleware/rbac";
import { paths } from "@/lib/env-config";

const router = Router();

interface OnboardTemplateQuery {
  name: string;
  description: string;
  source: string;
  url: string;
  filters: string;
  estimated_duration: number;
}

interface OnboardTemplate {
  id: string;
  label: string;
  description: string;
  source: string;
  queries: OnboardTemplateQuery[];
}

function humanize(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Filter entity names the UI renders as dropdowns; surface them on templates so
// onboarded queries pre-wire the common filters.
const KNOWN_FILTERS = ["region", "team", "environment", "date_range"];

// GET /api/admin/onboard/templates — prebuilt query templates derived from the
// per-source corpus files (src/training/groups/corpus-<source>.json).
router.get(
  "/templates",
  requirePermission("groups.create"),
  (_req: Request, res: Response) => {
    try {
      const dir = paths.training.groupsDir;
      let files: string[] = [];
      try {
        files = readdirSync(dir);
      } catch {
        files = [];
      }

      const templates: OnboardTemplate[] = [];
      for (const file of files) {
        const match = /^corpus-(.+)\.json$/.exec(file);
        if (!match) continue;
        const source = match[1];
        let corpus: {
          entities?: Record<string, { options?: Record<string, unknown> }>;
        };
        try {
          corpus = JSON.parse(readFileSync(join(dir, file), "utf-8"));
        } catch {
          continue;
        }
        const entities = corpus.entities ?? {};
        const options = entities.query_name?.options ?? {};
        const filters = KNOWN_FILTERS.filter((f) => f in entities);
        const queries: OnboardTemplateQuery[] = Object.keys(options).map(
          (name) => ({
            name,
            description: humanize(name),
            source,
            url: "",
            filters: filters.join(", "),
            estimated_duration: 2000,
          }),
        );
        templates.push({
          id: source,
          label: `${humanize(source)} template`,
          description: `${queries.length} prebuilt ${source} queries`,
          source,
          queries,
        });
      }

      return res.json({ templates });
    } catch (error) {
      logger.error({ error }, "Failed to read onboard templates");
      return res.status(500).json({ templates: [] });
    }
  },
);

export default router;
