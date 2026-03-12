export const INTENTS = {
  GREETING: 'greeting',
  FAREWELL: 'farewell',
  HELP: 'help',
  QUERY_EXECUTE: 'query.execute',
  QUERY_MULTI: 'query.multi',
  QUERY_LIST: 'query.list',
  QUERY_ESTIMATE: 'query.estimate',
  URL_FIND: 'url.find',
  KNOWLEDGE_SEARCH: 'knowledge.search',
} as const;

export const NLP_CONFIDENCE_THRESHOLD = 0.65;
export const FUZZY_CONFIDENCE_THRESHOLD = 0.5;
export const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const API_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
