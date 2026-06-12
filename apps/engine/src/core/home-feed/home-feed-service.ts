import * as fs from "fs";
import * as path from "path";

export interface BriefingSummary {
  anomaliesDetected: number;
  watchAlertsTriggered: number;
  topQueryName?: string;
  topQueryCount?: number;
  lastLoginAt?: string;
  generatedAt: string;
  message: string;
}

export interface SuggestedQuery {
  queryName: string;
  reason: string;
  score: number;
}

export interface RecentQueryItem {
  queryName: string;
  groupId: string;
  userMessage: string;
  filters?: Record<string, string>;
  rowCount?: number;
  timestamp: string;
}

interface AnomalyRecord {
  queryName?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface AlertRecord {
  id?: string;
  severity?: string;
  read?: boolean;
  timestamp?: string;
  [key: string]: unknown;
}

interface TimePattern {
  queryName: string;
  hourDistribution: number[];
  dayDistribution: number[];
  totalCount: number;
}

interface PreferencesFile {
  userId?: string;
  recentQueries?: RecentQueryItem[];
  [key: string]: unknown;
}

export class HomeFeedService {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  generateBriefing(groupId: string, _userId: string): BriefingSummary {
    const anomaliesDetected = this.countRecentAnomalies(groupId);
    const watchAlertsTriggered = this.countRecentAlerts(groupId);
    const generatedAt = new Date().toISOString();

    const parts: string[] = [];
    parts.push(`${anomaliesDetected} anomalies detected`);
    parts.push(`${watchAlertsTriggered} watch alerts triggered`);
    const message = parts.join(", ") + " in the last 24 hours.";

    return {
      anomaliesDetected,
      watchAlertsTriggered,
      generatedAt,
      message,
    };
  }

  getRecentActivity(userId: string, limit: number): RecentQueryItem[] {
    const filePath = path.join(this.dataDir, "preferences", `${userId}.json`);
    if (!fs.existsSync(filePath)) return [];

    const raw = fs.readFileSync(filePath, "utf-8");
    const prefs = JSON.parse(raw) as PreferencesFile;
    const queries = prefs.recentQueries ?? [];

    return [...queries]
      .reverse()
      .slice(0, limit)
      .map((q) => ({
        queryName: q.queryName,
        groupId: q.groupId,
        userMessage: q.userMessage,
        filters: q.filters,
        rowCount: q.rowCount,
        timestamp: q.timestamp,
      }));
  }

  getSuggestedQueries(groupId: string, _userId: string): SuggestedQuery[] {
    const filePath = path.join(
      this.dataDir,
      "learning",
      groupId,
      "time-patterns.json",
    );
    if (!fs.existsSync(filePath)) return [];

    const raw = fs.readFileSync(filePath, "utf-8");
    const patterns = JSON.parse(raw) as TimePattern[];

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    const scored = patterns.map((p) => {
      const hourScore = p.hourDistribution[currentHour] ?? 0;
      const dayScore = p.dayDistribution[currentDay] ?? 0;
      const score = (hourScore + dayScore) / 2;
      return {
        queryName: p.queryName,
        reason: "Frequently run at this time",
        score,
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  private countRecentAnomalies(groupId: string): number {
    const filePath = path.join(
      this.dataDir,
      "anomaly",
      groupId,
      "history.jsonl",
    );
    return this.countRecentJsonlRecords<AnomalyRecord>(filePath);
  }

  private countRecentAlerts(groupId: string): number {
    const filePath = path.join(this.dataDir, "watch", groupId, "alerts.jsonl");
    return this.countRecentJsonlRecords<AlertRecord>(filePath);
  }

  private countRecentJsonlRecords<T extends { timestamp?: string }>(
    filePath: string,
  ): number {
    if (!fs.existsSync(filePath)) return 0;

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);

    let count = 0;
    for (const line of lines) {
      try {
        const record = JSON.parse(line) as T;
        if (record.timestamp && new Date(record.timestamp) >= cutoff) {
          count++;
        }
      } catch {
        // skip malformed lines
      }
    }
    return count;
  }
}
