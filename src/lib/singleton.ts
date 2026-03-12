import { ChatbotEngine } from '@/core/engine';
import { NlpService } from '@/core/nlp/nlp-service';
import { FuzzyMatcher } from '@/core/nlp/fuzzy-matcher';
import { ApiClient } from '@/core/api-connector/api-client';
import { QueryService } from '@/core/api-connector/query-service';
import { ResponseGenerator } from '@/core/response/response-generator';
import { SessionManager } from '@/core/session/session-manager';
import { getGroupConfig } from '@/config/group-config';

const engines = new Map<string, ChatbotEngine>();

export function getEngine(groupId: string = 'default'): ChatbotEngine {
  const existing = engines.get(groupId);
  if (existing) return existing;

  const groupConfig = getGroupConfig(groupId);

  const fuzzyMatcher = new FuzzyMatcher(groupConfig.faq);
  const nlpService = new NlpService(fuzzyMatcher, groupConfig.corpus);
  const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
  const queryService = new QueryService(apiClient, groupConfig.sources);
  const responseGenerator = new ResponseGenerator(queryService, groupConfig.templates);
  const sessionManager = new SessionManager();

  const engine = new ChatbotEngine(nlpService, responseGenerator, sessionManager);
  engines.set(groupId, engine);
  return engine;
}

export function invalidateEngine(groupId: string): void {
  engines.delete(groupId);
}

export function invalidateAllEngines(): void {
  engines.clear();
}
