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

export interface WorkflowListResponse {
  success: boolean;
  data: Workflow[];
}

export interface WorkflowExecuteResponse {
  success: boolean;
  data: unknown;
  message?: string;
}
