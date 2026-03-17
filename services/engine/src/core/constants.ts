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
  DOCUMENT_ASK: 'document.ask',
  DOCUMENT_LIST: 'document.list',
  QUERY_SEARCH: 'query.search',
  FOLLOWUP_GROUP_BY: 'followup.group_by',
  FOLLOWUP_SORT: 'followup.sort',
  FOLLOWUP_FILTER: 'followup.filter',
  FOLLOWUP_SUMMARY: 'followup.summary',
  FOLLOWUP_TOP_N: 'followup.top_n',
  FOLLOWUP_AGGREGATION: 'followup.aggregation',
  FOLLOWUP_DATA_LOOKUP: 'followup.data_lookup',
} as const;

export const NLP_CONFIDENCE_THRESHOLD = 0.65;
export const FUZZY_CONFIDENCE_THRESHOLD = 0.5;
export const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const API_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_SESSIONS = 10_000;

// Learning pipeline constants
export const LEARNING_CONFIDENCE_THRESHOLD = 0.4;
export const AUTO_LEARN_PROCESS_INTERVAL = 50;
export const AUTO_LEARN_MIN_POSITIVE = 3;
export const AUTO_LEARN_MAX_NEG_RATIO = 0.2;
