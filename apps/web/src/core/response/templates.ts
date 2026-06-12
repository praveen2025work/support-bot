export const responseTemplates: Record<string, string[]> = {
  greeting: [
    'Hello! I can help you run queries (with filters), find URLs, or combine multiple data sources. What would you like to do?',
    'Hi there! How can I assist you today? I can run queries, find URLs, or answer questions about our data.',
  ],
  farewell: [
    'Goodbye! Feel free to come back anytime.',
    'See you later! Let me know if you need anything else.',
  ],
  help: [
    'I can help you with:\n- **Ask any question** — I\'ll search the knowledge base automatically!\n- Running queries against our data (with filters)\n- Data operations: group by, sort, summarize, top-N\n- Running multiple queries in a single request\n- Finding relevant URLs and documentation\n- Listing available queries\n\nExamples:\n- "what is the auth flow?" (searches all docs)\n- "how do I deploy?" (finds deployment guide)\n- "run monthly revenue for this month"\n- "show me active users in US"\n- "list queries"\n\nJust tell me what you need!',
  ],
  unknown: [
    "I'm not sure I understand. Could you rephrase that? You can type \"help\" to see what I can do.",
    "I didn't quite catch that. Try asking me to run a query, find a URL, or list available queries.",
  ],
};
