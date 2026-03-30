import { Router, Request, Response } from "express";
import path from "path";
import { HomeFeedService } from "../core/home-feed/home-feed-service";

const router = Router();
const dataDir = path.resolve(__dirname, "../../data");
const homeFeedService = new HomeFeedService(dataDir);

// GET /api/home-feed?groupId=default&userId=jdoe
router.get("/", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const userId = (req.query.userId as string) || "anonymous";

    const briefing = homeFeedService.generateBriefing(groupId, userId);
    const suggestedQueries = homeFeedService.getSuggestedQueries(
      groupId,
      userId,
    );
    const recentActivity = homeFeedService.getRecentActivity(userId, 10);

    res.json({
      success: true,
      data: {
        briefing,
        suggestedQueries,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("[HomeFeed] Error generating feed:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to generate home feed" });
  }
});

export default router;
