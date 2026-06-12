'use client';

import { useState, useCallback } from 'react';

export interface QueryResult {
  text: string;
  richContent?: { type: string; data: unknown };
  suggestions?: string[];
  executionMs?: number;
  intent?: string;
}

export function useQueryExecution(groupId: string, userName?: string) {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (queryName: string, filters?: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `run ${queryName}`,
          platform: 'web',
          groupId,
          userName,
          sessionId: `dashboard_${userName}_${Date.now()}`,
          ...(filters && Object.keys(filters).length > 0 ? { explicitFilters: filters } : {}),
        }),
      });
      if (!res.ok) throw new Error('Query execution failed');
      const data = await res.json();
      setResult({
        text: data.text || data.response,
        richContent: data.richContent,
        suggestions: data.suggestions,
        executionMs: data.executionMs,
        intent: data.intent,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, userName]);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, execute, clear };
}
