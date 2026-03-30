import { Router, Request, Response } from "express";
import path from "path";
import { WorkflowService } from "../core/workflow/workflow-service";
import type { WorkflowStep } from "../core/workflow/workflow-service";

const router = Router();
const dataDir = path.resolve(__dirname, "../../data");
const workflowService = new WorkflowService(dataDir);

// GET /api/workflows?groupId=default&userId=jdoe
router.get("/", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const userId = req.query.userId as string | undefined;
    const workflows = workflowService.listWorkflows(groupId, userId);
    res.json({ success: true, data: workflows });
  } catch (error) {
    console.error("[Workflows] List error:", error);
    res.status(500).json({ success: false, error: "Failed to list workflows" });
  }
});

// POST /api/workflows
router.post("/", (req: Request, res: Response) => {
  try {
    const { groupId = "default", ...input } = req.body as {
      groupId?: string;
      name: string;
      steps: WorkflowStep[];
      params: {
        name: string;
        type: string;
        options?: string | string[];
        defaultValue?: string;
      }[];
      owner: string;
      visibility: "private" | "group";
    };

    if (!input.name || !input.steps || !input.owner) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: name, steps, owner",
      });
      return;
    }

    const workflow = workflowService.createWorkflow(groupId, {
      name: input.name,
      steps: input.steps,
      params: input.params ?? [],
      owner: input.owner,
      visibility: input.visibility ?? "private",
    });
    res.status(201).json({ success: true, data: workflow });
  } catch (error) {
    console.error("[Workflows] Create error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create workflow" });
  }
});

// DELETE /api/workflows/:id?groupId=default
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const { id } = req.params;
    workflowService.deleteWorkflow(groupId, id);
    res.json({ success: true });
  } catch (error) {
    console.error("[Workflows] Delete error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to delete workflow" });
  }
});

// POST /api/workflows/:id/execute
router.post("/:id/execute", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const { id } = req.params;
    const params = (req.body?.params ?? {}) as Record<string, string>;

    const workflow = workflowService.getWorkflow(groupId, id);
    if (!workflow) {
      res.status(404).json({ success: false, error: "Workflow not found" });
      return;
    }

    // Resolve $param:name placeholders in step fields
    const resolvedSteps = workflow.steps.map((step) => {
      const resolved: WorkflowStep = { ...step };

      const resolveValue = (val: string | undefined): string | undefined => {
        if (!val) return val;
        return val.replace(/\$param:(\w+)/g, (_match, paramName: string) =>
          paramName in params ? params[paramName] : `$param:${paramName}`,
        );
      };

      if (resolved.value !== undefined) {
        resolved.value = resolveValue(resolved.value);
      }

      if (resolved.column !== undefined) {
        resolved.column = resolveValue(resolved.column);
      }

      if (resolved.filters) {
        const resolvedFilters: Record<string, string> = {};
        for (const [col, val] of Object.entries(resolved.filters)) {
          resolvedFilters[col] = resolveValue(val) ?? val;
        }
        resolved.filters = resolvedFilters;
      }

      return resolved;
    });

    res.json({ success: true, data: resolvedSteps });
  } catch (error) {
    console.error("[Workflows] Execute error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to execute workflow" });
  }
});

export default router;
