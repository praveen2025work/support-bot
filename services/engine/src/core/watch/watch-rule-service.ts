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

/**
 * Volatile per-rule runtime state. Persisted separately from the rule
 * definition (rules.json) so the cron evaluator's frequent timestamp writes
 * never churn the version-controlled config file. See rules-state.json.
 */
interface RuleRuntimeState {
  lastCheckedAt?: string;
  lastTriggeredAt?: string;
}

export class WatchRuleService {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  listRules(groupId: string): WatchRule[] {
    const filePath = this.rulesPath(groupId);
    if (!fs.existsSync(filePath)) return [];
    const rules = JSON.parse(fs.readFileSync(filePath, "utf-8")) as WatchRule[];
    // Merge volatile runtime state (last checked/triggered) back onto each
    // rule so consumers see a complete WatchRule despite the split storage.
    const state = this.loadState(groupId);
    return rules.map((rule) => {
      const runtime = state[rule.id];
      return runtime ? { ...rule, ...runtime } : rule;
    });
  }

  /**
   * Persist volatile runtime state (lastCheckedAt / lastTriggeredAt) for a
   * rule WITHOUT rewriting rules.json. Called by the cron evaluator on every
   * tick; routing it here keeps the config file stable in git.
   */
  recordCheck(
    groupId: string,
    ruleId: string,
    runtime: RuleRuntimeState,
  ): void {
    const state = this.loadState(groupId);
    state[ruleId] = { ...state[ruleId], ...runtime };
    this.saveState(groupId, state);
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
    // Drop any orphaned runtime state for the removed rule.
    const state = this.loadState(groupId);
    if (state[ruleId]) {
      delete state[ruleId];
      this.saveState(groupId, state);
    }
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

  markAllAlertsRead(groupId: string): number {
    const filePath = this.alertsPath(groupId);
    if (!fs.existsSync(filePath)) return 0;
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    let changed = 0;
    const updated = lines.map((l) => {
      const alert = JSON.parse(l) as WatchAlert;
      if (alert.read) return l;
      changed += 1;
      return JSON.stringify({ ...alert, read: true });
    });
    fs.writeFileSync(filePath, updated.join("\n") + "\n", "utf-8");
    return changed;
  }

  clearAlerts(groupId: string): number {
    const filePath = this.alertsPath(groupId);
    if (!fs.existsSync(filePath)) return 0;
    const removed = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0).length;
    fs.writeFileSync(filePath, "", "utf-8");
    return removed;
  }

  getUnreadCount(groupId: string): number {
    const alerts = this.getAlerts(groupId, Number.MAX_SAFE_INTEGER);
    return alerts.filter((a) => !a.read).length;
  }

  private rulesPath(groupId: string): string {
    return path.join(this.dataDir, "watch", groupId, "rules.json");
  }

  private rulesStatePath(groupId: string): string {
    return path.join(this.dataDir, "watch", groupId, "rules-state.json");
  }

  private alertsPath(groupId: string): string {
    return path.join(this.dataDir, "watch", groupId, "alerts.jsonl");
  }

  private saveRules(groupId: string, rules: WatchRule[]): void {
    this.ensureDir(groupId);
    // Strip volatile runtime fields — rules.json is config only; runtime
    // state lives in rules-state.json. Guards against a merged WatchRule
    // (from listRules) leaking timestamps back into the committed file.
    const configOnly = rules.map((rule) => {
      const copy: WatchRule = { ...rule };
      delete copy.lastCheckedAt;
      delete copy.lastTriggeredAt;
      return copy;
    });
    fs.writeFileSync(
      this.rulesPath(groupId),
      JSON.stringify(configOnly, null, 2),
      "utf-8",
    );
  }

  private loadState(groupId: string): Record<string, RuleRuntimeState> {
    const filePath = this.rulesStatePath(groupId);
    if (!fs.existsSync(filePath)) return {};
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<
        string,
        RuleRuntimeState
      >;
    } catch {
      return {};
    }
  }

  private saveState(
    groupId: string,
    state: Record<string, RuleRuntimeState>,
  ): void {
    this.ensureDir(groupId);
    fs.writeFileSync(
      this.rulesStatePath(groupId),
      JSON.stringify(state, null, 2),
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
