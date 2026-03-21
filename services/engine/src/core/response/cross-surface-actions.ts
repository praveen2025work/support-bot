import type {
  BotResponse,
  ConversationContext,
  CrossSurfaceAction,
} from "../types";

/**
 * Generate cross-surface action buttons based on the response context.
 * These actions allow users to navigate between chat, dashboard, and gridboard.
 */
export function generateCrossSurfaceActions(
  response: BotResponse,
  context: ConversationContext,
): CrossSurfaceAction[] {
  const actions: CrossSurfaceAction[] = [];

  // Only add cross-surface actions when there are query results
  if (!context.lastQueryName || !context.lastApiResult) {
    return actions;
  }

  const queryName = context.lastQueryName;

  // "Pin to Dashboard" — available when viewing query results in chat
  if (
    response.intent?.startsWith("query.") ||
    response.intent?.startsWith("followup.") ||
    response.intent?.startsWith("analysis.")
  ) {
    actions.push({
      type: "pin_to_dashboard",
      label: "Pin to Dashboard",
      payload: {
        queryName,
        groupId: response.queryName ? undefined : queryName,
        displayMode:
          response.richContent?.type === "csv_table" ? "table" : "auto",
      },
    });
  }

  // "Open in GridBoard" — available when result is tabular
  if (
    response.richContent?.type === "csv_table" ||
    response.richContent?.type === "query_result" ||
    response.richContent?.type === "csv_group_by"
  ) {
    actions.push({
      type: "open_in_gridboard",
      label: "Open in GridBoard",
      payload: {
        queryName,
        columns: context.lastQueryColumns,
      },
    });
  }

  // "Export" — available when there are displayable results
  if (response.richContent && response.richContent.type !== "error") {
    actions.push({
      type: "export",
      label: "Export as CSV",
      payload: {
        queryName,
        format: "csv",
      },
    });
  }

  return actions;
}
