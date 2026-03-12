'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { generateId } from '@/lib/generate-id';

export interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  richContent?: {
    type: 'url_list' | 'query_result' | 'multi_query_result' | 'estimation' | 'error' | 'query_filter_form' | 'file_content' | 'document_search' | 'csv_table' | 'csv_aggregation' | 'query_list';
    data: unknown;
  };
  suggestions?: string[];
  executionMs?: number;
  referenceUrl?: string;
  isError?: boolean;
  retryText?: string;
  timestamp: Date;
}

interface QueryMeta {
  name: string;
  description?: string;
  filters: Array<string | { key: string; binding: string }>;
  type?: 'api' | 'url' | 'document' | 'csv';
}

const RUN_QUERY_PATTERN = /^run\s+(\S+)\s*$/i;

export function useChat(platform: 'web' | 'widget' = 'web', groupId?: string, userName?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const sessionIdRef = useRef<string>('');
  const statusTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const queriesCacheRef = useRef<{ groupId: string; queries: QueryMeta[] } | null>(null);
  const bypassFilterFormRef = useRef(false);
  const lastBotConfidenceRef = useRef<number>(1);
  const lastUserTextRef = useRef<string>('');

  useEffect(() => {
    sessionIdRef.current = `${platform}-${generateId()}`;
  }, [platform]);

  const clearStatusTimers = useCallback(() => {
    statusTimersRef.current.forEach(clearTimeout);
    statusTimersRef.current = [];
  }, []);

  const fetchQueries = useCallback(async (): Promise<QueryMeta[]> => {
    const gid = groupId || 'default';
    if (queriesCacheRef.current?.groupId === gid) {
      return queriesCacheRef.current.queries;
    }
    try {
      const res = await fetch(`/api/queries?groupId=${encodeURIComponent(gid)}`);
      if (!res.ok) return [];
      const data = await res.json();
      const queries = data.queries as QueryMeta[];
      queriesCacheRef.current = { groupId: gid, queries };
      return queries;
    } catch {
      return [];
    }
  }, [groupId]);

  const callChatApi = useCallback(
    async (text: string, explicitFilters?: Record<string, string>, feedbackType?: string): Promise<{ data?: Record<string, unknown>; error?: boolean }> => {
      const payload: Record<string, unknown> = {
        text,
        sessionId: sessionIdRef.current,
        platform,
        groupId,
        userName,
      };
      if (explicitFilters && Object.keys(explicitFilters).length > 0) {
        payload.explicitFilters = explicitFilters;
      }
      if (feedbackType) {
        payload.feedbackType = feedbackType;
        if (feedbackType === 'rephrase' && lastUserTextRef.current) {
          payload.previousMessageText = lastUserTextRef.current;
        }
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) return { error: true };
      const data = await res.json();
      return { data };
    },
    [platform, groupId, userName]
  );

  const sendMessage = useCallback(
    async (text: string, source?: 'suggestion_click' | 'typed') => {
      if (!text.trim() || isLoading) return;

      // Determine feedback type
      let feedbackType: string = source === 'suggestion_click' ? 'suggestion_click' : 'normal';
      if (source !== 'suggestion_click' && lastBotConfidenceRef.current < 0.8 && lastUserTextRef.current) {
        feedbackType = 'rephrase';
      }

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        text: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Check for filter form interception
      if (!bypassFilterFormRef.current) {
        const match = text.trim().match(RUN_QUERY_PATTERN);
        if (match) {
          const queryName = match[1];
          try {
            const queries = await fetchQueries();
            const query = queries.find(
              (q) => q.name.toLowerCase() === queryName.toLowerCase()
            );
            if (query && query.filters.length > 0) {
              const formMessage: Message = {
                id: generateId(),
                role: 'bot',
                text: `Configure filters for "${query.name}"${query.description ? ' — ' + query.description : ''}`,
                richContent: {
                  type: 'query_filter_form',
                  data: {
                    queryName: query.name,
                    description: query.description,
                    filters: query.filters,
                  },
                },
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, formMessage]);
              return;
            }
          } catch {
            // Fall through to normal flow
          }
        }
      }
      bypassFilterFormRef.current = false;

      setIsLoading(true);
      setLoadingStatus('Analyzing your request...');

      clearStatusTimers();
      statusTimersRef.current.push(
        setTimeout(() => setLoadingStatus('Processing...'), 1000),
        setTimeout(() => setLoadingStatus('Running query...'), 2500),
        setTimeout(() => setLoadingStatus('Fetching results...'), 5000),
        setTimeout(() => setLoadingStatus('Almost there...'), 10000)
      );

      try {
        let result = await callChatApi(text.trim(), undefined, feedbackType);

        // Auto-retry once on failure
        if (result.error) {
          setLoadingStatus('Retrying...');
          await new Promise((r) => setTimeout(r, 1000));
          result = await callChatApi(text.trim(), undefined, 'retry');
        }

        if (result.error || !result.data) {
          const errorMessage: Message = {
            id: generateId(),
            role: 'bot',
            text: 'Sorry, something went wrong. Please try again.',
            isError: true,
            retryText: text.trim(),
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        } else {
          const data = result.data;
          const botMessage: Message = {
            id: generateId(),
            role: 'bot',
            text: data.text as string,
            richContent: data.richContent as Message['richContent'],
            suggestions: data.suggestions as string[],
            executionMs: data.executionMs as number | undefined,
            referenceUrl: data.referenceUrl as string | undefined,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, botMessage]);
          // Track for feedback signal detection
          lastBotConfidenceRef.current = (data.confidence as number) ?? 1;
          lastUserTextRef.current = text.trim();
        }
      } catch {
        const errorMessage: Message = {
          id: generateId(),
          role: 'bot',
          text: 'Sorry, something went wrong. Please try again.',
          isError: true,
          retryText: text.trim(),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        clearStatusTimers();
        setIsLoading(false);
        setLoadingStatus('');
      }
    },
    [isLoading, platform, groupId, clearStatusTimers, fetchQueries, callChatApi]
  );

  const executeQuery = useCallback(
    async (queryName: string, filters: Record<string, string>) => {
      const parts: string[] = [];
      if (filters.date_range) parts.push(`for ${filters.date_range}`);
      if (filters.region) parts.push(`in ${filters.region}`);
      if (filters.environment) parts.push(`in ${filters.environment}`);
      if (filters.team) parts.push(`team ${filters.team}`);
      if (filters.severity) parts.push(`severity ${filters.severity}`);
      for (const [k, v] of Object.entries(filters)) {
        if (!['date_range', 'region', 'environment', 'team', 'severity'].includes(k) && v) {
          parts.push(`${k} ${v}`);
        }
      }

      const text =
        parts.length > 0
          ? `run ${queryName} ${parts.join(' ')}`
          : `run ${queryName}`;

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        text: text.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      setIsLoading(true);
      setLoadingStatus('Running query...');
      clearStatusTimers();

      try {
        let result = await callChatApi(
          text.trim(),
          Object.keys(filters).length > 0 ? filters : undefined
        );

        // Auto-retry once on failure
        if (result.error) {
          setLoadingStatus('Retrying...');
          await new Promise((r) => setTimeout(r, 1000));
          result = await callChatApi(
            text.trim(),
            Object.keys(filters).length > 0 ? filters : undefined
          );
        }

        if (result.error || !result.data) {
          const errorMessage: Message = {
            id: generateId(),
            role: 'bot',
            text: 'Sorry, something went wrong. Please try again.',
            isError: true,
            retryText: text.trim(),
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        } else {
          const data = result.data;
          const botMessage: Message = {
            id: generateId(),
            role: 'bot',
            text: data.text as string,
            richContent: data.richContent as Message['richContent'],
            suggestions: data.suggestions as string[],
            executionMs: data.executionMs as number | undefined,
            referenceUrl: data.referenceUrl as string | undefined,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, botMessage]);
        }
      } catch {
        const errorMessage: Message = {
          id: generateId(),
          role: 'bot',
          text: 'Sorry, something went wrong. Please try again.',
          isError: true,
          retryText: text.trim(),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        clearStatusTimers();
        setIsLoading(false);
        setLoadingStatus('');
      }
    },
    [isLoading, platform, groupId, clearStatusTimers, callChatApi]
  );

  const retryMessage = useCallback(
    async (retryText: string) => {
      bypassFilterFormRef.current = true;
      await sendMessage(retryText);
    },
    [sendMessage]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = `${platform}-${generateId()}`;
  }, [platform]);

  return { messages, isLoading, loadingStatus, sendMessage, executeQuery, retryMessage, clearMessages };
}
