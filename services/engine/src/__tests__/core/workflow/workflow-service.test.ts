import { WorkflowService } from "../../../core/workflow/workflow-service";
import * as fs from "fs";
import * as path from "path";

describe("WorkflowService", () => {
  let service: WorkflowService;
  const testDir = path.join(__dirname, "__test-workflow-data__");

  beforeEach(() => {
    fs.mkdirSync(path.join(testDir, "workflows"), { recursive: true });
    service = new WorkflowService(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test("createWorkflow creates and persists", () => {
    const wf = service.createWorkflow("default", {
      name: "Sales by Region",
      steps: [
        { type: "query", queryName: "sales_report" },
        { type: "filter", column: "region", value: "$param:region" },
        { type: "sort", column: "total", direction: "desc" },
      ],
      params: [{ name: "region", type: "select" }],
      owner: "jdoe",
      visibility: "group",
    });
    expect(wf.id).toBeDefined();
    expect(wf.steps).toHaveLength(3);
    expect(service.listWorkflows("default")).toHaveLength(1);
  });

  test("listWorkflows filters by visibility for non-owner", () => {
    service.createWorkflow("default", {
      name: "Private WF",
      steps: [{ type: "query", queryName: "test" }],
      params: [],
      owner: "jdoe",
      visibility: "private",
    });
    service.createWorkflow("default", {
      name: "Group WF",
      steps: [{ type: "query", queryName: "test" }],
      params: [],
      owner: "admin",
      visibility: "group",
    });
    const forJdoe = service.listWorkflows("default", "jdoe");
    expect(forJdoe).toHaveLength(2);
    const forOther = service.listWorkflows("default", "other");
    expect(forOther).toHaveLength(1);
    expect(forOther[0].name).toBe("Group WF");
  });

  test("deleteWorkflow removes workflow", () => {
    const wf = service.createWorkflow("default", {
      name: "To Delete",
      steps: [{ type: "query", queryName: "test" }],
      params: [],
      owner: "jdoe",
      visibility: "private",
    });
    service.deleteWorkflow("default", wf.id);
    expect(service.listWorkflows("default")).toHaveLength(0);
  });
});
