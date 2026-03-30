import { WatchRuleService } from "../../../core/watch/watch-rule-service";
import * as fs from "fs";
import * as path from "path";

describe("WatchRuleService", () => {
  let service: WatchRuleService;
  const testDir = path.join(__dirname, "__test-watch-data__");

  beforeEach(() => {
    fs.mkdirSync(path.join(testDir, "watch", "default"), { recursive: true });
    service = new WatchRuleService(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test("createRule creates and persists a rule", () => {
    const rule = service.createRule("default", {
      name: "High Error Rate",
      queryName: "error_report",
      type: "threshold",
      condition: { column: "error_rate", operator: "gt", value: 5 },
      cronExpression: "*/30 * * * *",
      channels: ["in_app"],
      owner: "jdoe",
    });
    expect(rule.id).toBeDefined();
    expect(rule.name).toBe("High Error Rate");
    expect(rule.enabled).toBe(true);
    const rules = service.listRules("default");
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe(rule.id);
  });

  test("updateRule updates fields", () => {
    const rule = service.createRule("default", {
      name: "Test Rule",
      queryName: "test",
      type: "threshold",
      condition: { column: "val", operator: "gt", value: 10 },
      cronExpression: "0 * * * *",
      channels: ["in_app"],
      owner: "jdoe",
    });
    const updated = service.updateRule("default", rule.id, { enabled: false });
    expect(updated).not.toBeNull();
    expect(updated!.enabled).toBe(false);
  });

  test("deleteRule removes rule", () => {
    const rule = service.createRule("default", {
      name: "To Delete",
      queryName: "test",
      type: "freshness",
      condition: { maxStaleMinutes: 120 },
      cronExpression: "0 * * * *",
      channels: ["email"],
      recipients: ["admin@co.com"],
      owner: "admin",
    });
    service.deleteRule("default", rule.id);
    expect(service.listRules("default")).toHaveLength(0);
  });

  test("addAlert appends to alerts log", () => {
    service.addAlert("default", {
      id: "alert_001",
      ruleId: "rule_001",
      ruleName: "Test",
      queryName: "test",
      groupId: "default",
      type: "threshold",
      severity: "critical",
      message: "error_rate exceeded 5%",
      triggeredValue: "7.2",
      timestamp: new Date().toISOString(),
      read: false,
    });
    const alerts = service.getAlerts("default", 20);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("critical");
  });

  test("markAlertRead updates read status", () => {
    service.addAlert("default", {
      id: "alert_002",
      ruleId: "rule_001",
      ruleName: "Test",
      queryName: "test",
      groupId: "default",
      type: "threshold",
      severity: "warning",
      message: "test",
      timestamp: new Date().toISOString(),
      read: false,
    });
    service.markAlertRead("default", "alert_002");
    const alerts = service.getAlerts("default", 20);
    expect(alerts[0].read).toBe(true);
  });
});
