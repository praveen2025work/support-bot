import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

export interface WatchRule {
  id: string;
  name: string;
  queryName: string;
  groupId: string;
  type: string;
  condition: Record<string, unknown>;
  cronExpression: string;
  channels: string[];
  recipients?: string[];
  owner: string;
  enabled: boolean;
  snoozeUntil?: string;
  cooldownMinutes: number;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
  lastTriggeredAt?: string;
}

export interface WatchAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  queryName: string;
  groupId: string;
  type: string;
  severity: string;
  message: string;
  triggeredValue?: string;
  timestamp: string;
  read: boolean;
}

export interface CreateRuleInput {
  name: string;
  queryName: string;
  type: string;
  condition: Record<string, unknown>;
  cronExpression: string;
  channels: string[];
  recipients?: string[];
  owner: string;
  cooldownMinutes?: number;
}

export class WatchRuleService {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  listRules(groupId: string): WatchRule[] {
    const filePath = this.rulesPath(groupId);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as WatchRule[];
  }

  createRule(groupId: string, input: CreateRuleInput): WatchRule {
    const now = new Date().toISOString();
    const rule: WatchRule = {
      id: randomUUID(),
      name: input.name,
      queryName: input.queryName,
      groupId,
      type: input.type,
      condition: input.condition,
      cronExpression: input.cronExpression,
      channels: input.channels,
      recipients: input.recipients,
      owner: input.owner,
      enabled: true,
      cooldownMinutes: input.cooldownMinutes ?? 60,
      createdAt: now,
      updatedAt: now,
    };
    const rules = this.listRules(groupId);
    this.saveRules(groupId, [...rules, rule]);
    return rule;
  }

  updateRule(
    groupId: string,
    ruleId: string,
    updates: Partial<Omit<WatchRule, "id" | "createdAt">>,
  ): WatchRule | null {
    const rules = this.listRules(groupId);
    const idx = rules.findIndex((r) => r.id === ruleId);
    if (idx === -1) return null;
    const updated: WatchRule = {
      ...rules[idx],
      ...updates,
      id: rules[idx].id,
      updatedAt: new Date().toISOString(),
    };
    const newRules = rules.map((r, i) => (i === idx ? updated : r));
    this.saveRules(groupId, newRules);
    return updated;
  }

  deleteRule(groupId: string, ruleId: string): void {
    const rules = this.listRules(groupId);
    this.saveRules(
      groupId,
      rules.filter((r) => r.id !== ruleId),
    );
  }

  addAlert(groupId: string, alert: WatchAlert): void {
    this.ensureDir(groupId);
    const filePath = this.alertsPath(groupId);
    fs.appendFileSync(filePath, JSON.stringify(alert) + "\n", "utf-8");
  }

  getAlerts(groupId: string, limit: number): WatchAlert[] {
    const filePath = this.alertsPath(groupId);
    if (!fs.existsSync(filePath)) return [];
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    const alerts = lines.map((l) => JSON.parse(l) as WatchAlert);
    return alerts.reverse().slice(0, limit);
  }

  markAlertRead(groupId: string, alertId: string): void {
    const filePath = this.alertsPath(groupId);
    if (!fs.existsSync(filePath)) return;
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    const updated = lines.map((l) => {
      const alert = JSON.parse(l) as WatchAlert;
      if (alert.id === alertId) {
        return JSON.stringify({ ...alert, read: true });
      }
      return l;
    });
    fs.writeFileSync(filePath, updated.join("\n") + "\n", "utf-8");
  }

  getUnreadCount(groupId: string): number {
    const alerts = this.getAlerts(groupId, Number.MAX_SAFE_INTEGER);
    return alerts.filter((a) => !a.read).length;
  }

  private rulesPath(groupId: string): string {
    return path.join(this.dataDir, "watch", groupId, "rules.json");
  }

  private alertsPath(groupId: string): string {
    return path.join(this.dataDir, "watch", groupId, "alerts.jsonl");
  }

  private saveRules(groupId: string, rules: WatchRule[]): void {
    this.ensureDir(groupId);
    fs.writeFileSync(
      this.rulesPath(groupId),
      JSON.stringify(rules, null, 2),
      "utf-8",
    );
  }

  private ensureDir(groupId: string): void {
    const dir = path.join(this.dataDir, "watch", groupId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
