import { Router, Request, Response } from "express";
import { CatalogService } from "../core/catalog/catalog-service";
import path from "path";

const router = Router();
const dataDir = path.resolve(__dirname, "../../data");
const catalogService = new CatalogService(dataDir);

// GET /api/catalog?groupId=default&q=search_term
router.get("/", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const searchQuery = req.query.q as string | undefined;
    const results = searchQuery
      ? catalogService.search(groupId, searchQuery)
      : catalogService.listQueries(groupId);
    res.json({ success: true, data: results, total: results.length });
  } catch (error) {
    console.error("[Catalog] List error:", error);
    res.status(500).json({ success: false, error: "Failed to load catalog" });
  }
});

// GET /api/catalog/:queryName?groupId=default
router.get("/:queryName", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const detail = catalogService.getQueryDetail(groupId, req.params.queryName);
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
