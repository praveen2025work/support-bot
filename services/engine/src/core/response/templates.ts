export const responseTemplates: Record<string, string[]> = {
  greeting: [
    "Hello! I'm MITR AI. I can help you run queries (with filters), find URLs, or combine multiple data sources. What would you like to do?",
    "Hi there! I'm MITR AI — how can I assist you today? I can run queries, find URLs, or answer questions about our data.",
  ],
  farewell: [
    "Goodbye! Feel free to come back to MITR AI anytime.",
    "See you later! Let me know if you need anything else.",
  ],
  help: [
    'I\'m MITR AI. I can help you with:\n- **Ask any question** — I\'ll search the knowledge base automatically!\n- Running queries against our data (with filters)\n- Data operations: group by, sort, summarize, top-N, value comparisons\n- Running multiple queries in a single request\n- Finding relevant URLs and documentation\n- **Export** results as CSV, Excel, or JSON\n- **Undo** the last follow-up operation\n- **ML analysis**: outliers, trends, clustering, forecasting, PCA, and more\n- Listing available queries\n\nExamples:\n- "what is the auth flow?" (searches all docs)\n- "run monthly revenue for this month"\n- "show me active users in US"\n- "retention > 70" (filter by value)\n- "export as csv" (download results)\n- "undo" (revert last operation)\n- "find outliers" / "show trend" / "forecast ahead"\n- "list queries"\n\nJust tell me what you need!',
  ],
  unknown: [
    'I\'m not sure I understand. Could you rephrase that? You can type "help" to see what I can do.',
    "I didn't quite catch that. Try asking me to run a query, find a URL, or list available queries.",
  ],

  // ── Error variants ─────────────────────────────────────────────────
  no_results: [
    "The query returned no results. Try adjusting your filters or running a different query.",
    "No data found for this request. You might want to broaden your search or check the filters.",
  ],
  permission_denied: [
    "You don't have permission to access this resource. Please contact your administrator.",
    "Access denied. This resource requires additional permissions.",
  ],
  rate_limited: [
    "You're making requests too quickly. Please wait a moment and try again.",
    "Rate limit reached — please slow down and retry in a few seconds.",
  ],
  timeout: [
    "The request took too long and timed out. Try simplifying your query or narrowing the date range.",
    "Query timed out. This might be a large dataset — try adding filters to reduce the result size.",
  ],
  partial_results: [
    "Showing partial results — the full dataset was too large. Try adding filters to narrow down.",
    "Results have been truncated for performance. Use filters to get the specific data you need.",
  ],
  data_source_error: [
    "There was a problem connecting to the data source. The team has been notified.",
    "Could not reach the data source. Please try again in a moment.",
  ],
  empty_query: [
    "It looks like you sent an empty message. What would you like to know?",
    "I didn't receive a message. Try typing a question or command!",
  ],
};
