import type {
  ClassificationResult,
  BotResponse,
  ConversationContext,
} from "../../types";

/**
 * Handle confirmation ("yes", "go ahead", "correct").
 * If there's a pending action in context, confirm it.
 * Otherwise, treat as ambiguous and prompt the user.
 */
export function handleConfirm(
  classification: ClassificationResult,
  context: ConversationContext,
): BotResponse {
  // Check if the last bot message was a question or suggestion
  const lastBotMsg = [...context.history]
    .reverse()
    .find((h) => h.role === "bot");

  if (lastBotMsg && lastBotMsg.text.includes("?")) {
    return {
      text: "Got it! Could you tell me specifically what you'd like me to do? For example, try running a query or asking a question.",
      suggestions: context.lastQueryName
        ? ["Summarize", "Show trend", `Run ${context.lastQueryName}`]
        : ["List queries", "Help"],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }

  return {
    text: "I'm not sure what to confirm. Could you tell me what you'd like to do?",
    suggestions: ["List queries", "Help"],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

/**
 * Handle negation ("no", "cancel", "never mind").
 */
export function handleNegate(
  classification: ClassificationResult,
  context: ConversationContext,
): BotResponse {
  return {
    text: "No problem! What would you like to do instead?",
    suggestions: context.lastQueryName
      ? ["List queries", `Run ${context.lastQueryName}`, "Help"]
      : ["List queries", "Help"],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

/**
 * Handle clarification requests ("what do you mean", "explain").
 * Provides context about the last bot response.
 */
export function handleClarify(
  classification: ClassificationResult,
  context: ConversationContext,
): BotResponse {
  const lastBotMsg = [...context.history]
    .reverse()
    .find((h) => h.role === "bot");

  if (!lastBotMsg) {
    return {
      text: "I haven't said anything yet! Try asking me a question or running a query.",
      suggestions: ["List queries", "Help"],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }

  // Provide context about what was shown
  if (context.lastQueryName) {
    return {
      text:
        `I showed you results from the **${context.lastQueryName}** query. You can:\n` +
        '- Ask follow-up questions (e.g., "group by region", "top 10")\n' +
        '- Run analysis (e.g., "find outliers", "show trend")\n' +
        '- Apply filters (e.g., "filter by region US")\n' +
        "- Or ask me anything else!",
      suggestions: ["Summarize", "Find outliers", "List queries"],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }

  return {
    text:
      "I can help you run queries, analyze data, find documents, and more. " +
      'Type "help" for a full list of what I can do, or "list queries" to see available data.',
    suggestions: ["Help", "List queries"],
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}
