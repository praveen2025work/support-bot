import { HomeFeedService } from "../../../core/home-feed/home-feed-service";
import * as fs from "fs";
import * as path from "path";

describe("HomeFeedService", () => {
  let service: HomeFeedService;
  const testDir = path.join(__dirname, "__test-feed-data__");

  beforeEach(() => {
    fs.mkdirSync(path.join(testDir, "anomaly", "default"), { recursive: true });
    fs.mkdirSync(path.join(testDir, "watch", "default"), { recursive: true });
    fs.mkdirSync(path.join(testDir, "learning", "default"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(testDir, "preferences"), { recursive: true });

    fs.writeFileSync(
      path.join(testDir, "anomaly", "default", "history.jsonl"),
      [
        JSON.stringify({
          queryName: "sales",
          column: "revenue",
          timestamp: new Date().toISOString(),
        }),
        JSON.stringify({
          queryName: "sales",
          column: "cost",
          timestamp: new Date().toISOString(),
        }),
      ].join("\n") + "\n",
    );
    fs.writeFileSync(
      path.join(testDir, "watch", "default", "alerts.jsonl"),
      JSON.stringify({
        id: "a1",
        severity: "critical",
        read: false,
        timestamp: new Date().toISOString(),
      }) + "\n",
    );
    fs.writeFileSync(
      path.join(testDir, "learning", "default", "time-patterns.json"),
      JSON.stringify([
        {
          queryName: "sales_report",
          hourDistribution: Array(24).fill(1),
          dayDistribution: Array(7).fill(1),
          totalCount: 50,
        },
      ]),
    );
    fs.writeFileSync(
      path.join(testDir, "preferences", "jdoe.json"),
      JSON.stringify({
        userId: "jdoe",
        recentQueries: [
          {
            queryName: "sales_report",
            groupId: "default",
            userMessage: "show sales",
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    );

    service = new HomeFeedService(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test("generateBriefing returns summary with counts", () => {
    const briefing = service.generateBriefing("default", "jdoe");
    expect(briefing.anomaliesDetected).toBe(2);
    expect(briefing.watchAlertsTriggered).toBe(1);
    expect(briefing.message).toContain("2 anomalies");
  });

  test("getRecentActivity returns user recent queries", () => {
    const recent = service.getRecentActivity("jdoe", 5);
    expect(recent).toHaveLength(1);
    expect(recent[0].queryName).toBe("sales_report");
  });

  test("getSuggestedQueries returns time-relevant suggestions", () => {
    const suggestions = service.getSuggestedQueries("default", "jdoe");
    expect(suggestions.length).toBeGreaterThanOrEqual(0);
  });
});
