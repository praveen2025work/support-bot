import type {
  ClassificationResult,
  BotResponse,
  ConversationContext,
} from "../../types";
import { extractCsvDataFromContext } from "./followup-handler";

/**
 * Handle export requests ("export as CSV", "download excel").
 * Packages the last query result for client-side download.
 */
export function handleExport(
  classification: ClassificationResult,
  context: ConversationContext,
): BotResponse {
  if (!context.lastQueryName || !context.lastApiResult) {
    return {
      text: "No data to export. Please run a query first, then ask me to export.",
      suggestions: ["List queries", "Help"],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }

  const csvData = extractCsvDataFromContext(context);
  if (!csvData || csvData.rows.length === 0) {
    return {
      text: "The current result set is empty — nothing to export.",
      suggestions: [`Run ${context.lastQueryName}`, "List queries"],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }

  // Detect format from user text
  const userText =
    context.history.length > 0
      ? (context.history[context.history.length - 1]?.text ?? "").toLowerCase()
      : "";
  const format = userText.includes("json")
    ? "json"
    : userText.includes("xlsx") || userText.includes("excel")
      ? "xlsx"
      : "csv";

  return {
    text: `Here are the results from **${context.lastQueryName}** ready for ${format.toUpperCase()} download (${csvData.rows.length} rows, ${csvData.headers.length} columns).`,
    richContent: {
      type: "csv_table",
      data: {
        headers: csvData.headers,
        rows: csvData.rows,
        exportFormat: format,
        exportReady: true,
        queryName: context.lastQueryName,
      },
    },
    suggestions: ["Summarize", "Show trend", "List queries"],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

/**
 * Handle undo requests ("undo", "go back", "revert").
 * Reverts to the previous state by popping the last follow-up chain step.
 */
export function handleUndo(
  classification: ClassificationResult,
  context: ConversationContext,
): BotResponse {
  if (!context.followUpChain || context.followUpChain.length === 0) {
    if (!context.lastQueryName) {
      return {
        text: "Nothing to undo — you haven't performed any operations yet.",
        suggestions: ["List queries", "Help"],
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }

    return {
      text: `No follow-up operations to undo. You can re-run the original query: **${context.lastQueryName}**.`,
      suggestions: [`Run ${context.lastQueryName}`, "List queries"],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }

  // Pop the last operation
  const removed = context.followUpChain.pop()!;
  const remaining = context.followUpChain.length;

  const chainDescription =
    remaining > 0
      ? `Current chain: ${context.followUpChain.map((s) => s.description).join(" → ")}`
      : `Back to the original **${context.lastQueryName}** result.`;

  return {
    text: `Undid: "${removed.description}". ${chainDescription}\n\nPlease re-run the query to see the reverted data, or continue with a new operation.`,
    suggestions: context.lastQueryName
      ? [`Run ${context.lastQueryName}`, "Summarize", "List queries"]
      : ["List queries", "Help"],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}
