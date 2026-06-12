import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

export type WorkflowStepType =
  | "query"
  | "filter"
  | "groupBy"
  | "sort"
  | "aggregate";

export interface WorkflowStep {
  type: WorkflowStepType;
  queryName?: string;
  filters?: Record<string, string>;
  column?: string;
  value?: string;
  direction?: "asc" | "desc";
  aggregation?: string;
}

export interface WorkflowParam {
  name: string;
  type: "text" | "select" | "number" | "date";
  options?: string | string[];
  defaultValue?: string;
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  params: WorkflowParam[];
  owner: string;
  visibility: "private" | "group";
  groupId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowInput {
  name: string;
  steps: WorkflowStep[];
  params: WorkflowParam[];
  owner: string;
  visibility: "private" | "group";
}

export class WorkflowService {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  listWorkflows(groupId: string, userId?: string): Workflow[] {
    const filePath = this.workflowsPath(groupId);
    if (!fs.existsSync(filePath)) return [];
    const workflows = JSON.parse(
      fs.readFileSync(filePath, "utf-8"),
    ) as Workflow[];
    if (userId === undefined) return workflows;
    return workflows.filter(
      (wf) => wf.visibility === "group" || wf.owner === userId,
    );
  }

  createWorkflow(groupId: string, input: CreateWorkflowInput): Workflow {
    const now = new Date().toISOString();
    const workflow: Workflow = {
      id: randomUUID(),
      name: input.name,
      steps: input.steps,
      params: input.params,
      owner: input.owner,
      visibility: input.visibility,
      groupId,
      createdAt: now,
      updatedAt: now,
    };
    const workflows = this.listWorkflows(groupId);
    this.saveWorkflows(groupId, [...workflows, workflow]);
    return workflow;
  }

  deleteWorkflow(groupId: string, id: string): void {
    const workflows = this.listWorkflows(groupId);
    this.saveWorkflows(
      groupId,
      workflows.filter((wf) => wf.id !== id),
    );
  }

  getWorkflow(groupId: string, id: string): Workflow | null {
    const workflows = this.listWorkflows(groupId);
    return workflows.find((wf) => wf.id === id) ?? null;
  }

  private workflowsPath(groupId: string): string {
    return path.join(this.dataDir, "workflows", `${groupId}.json`);
  }

  private saveWorkflows(groupId: string, workflows: Workflow[]): void {
    this.ensureDir();
    fs.writeFileSync(
      this.workflowsPath(groupId),
      JSON.stringify(workflows, null, 2),
      "utf-8",
    );
  }

  private ensureDir(): void {
    const dir = path.join(this.dataDir, "workflows");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
