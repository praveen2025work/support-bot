import { Router, Request, Response } from "express";
import { CatalogService } from "../core/catalog/catalog-service";
import { getGroupConfig } from "@/config/group-config";
import path from "path";

const router = Router();
const dataDir = path.resolve(__dirname, "../../data");
const catalogService = new CatalogService(dataDir);

// GET /api/catalog?groupId=default&q=search_term
router.get("/", async (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const searchQuery = req.query.q as string | undefined;
    const groupConfig = getGroupConfig(groupId);
    const apiBaseUrl = groupConfig.apiBaseUrl ?? undefined;
    const sources = groupConfig.sources;

    const results = searchQuery
      ? await catalogService.search(groupId, searchQuery, apiBaseUrl, sources)
      : await catalogService.listQueries(groupId, apiBaseUrl, sources);
    res.json({ success: true, data: results, total: results.length });
  } catch (error) {
    console.error("[Catalog] List error:", error);
    res.status(500).json({ success: false, error: "Failed to load catalog" });
  }
});

// GET /api/catalog/:queryName?groupId=default
router.get("/:queryName", async (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const groupConfig = getGroupConfig(groupId);
    const apiBaseUrl = groupConfig.apiBaseUrl ?? undefined;
    const sources = groupConfig.sources;

    const detail = await catalogService.getQueryDetail(
      groupId,
      req.params.queryName,
      apiBaseUrl,
      sources,
    );
    if (!detail) {
      res.status(404).json({ success: false, error: "Query not found" });
      return;
    }
    res.json({ success: true, data: detail });
  } catch (error) {
    console.error("[Catalog] Detail error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to load query detail" });
  }
});

export default router;
