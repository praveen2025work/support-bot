'use client';

import { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface LogEntry {
  timestamp: string;
  sessionId: string;
  groupId: string;
  platform: string;
  userMessage: string;
  botResponse: string;
  intent: string;
  confidence: number;
  executionMs?: number;
  hasRichContent?: boolean;
}

export default function ConversationLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [intentDist, setIntentDist] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterIntent, setFilterIntent] = useState('');
  const [search, setSearch] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterGroup) params.set('group', filterGroup);
      if (filterIntent) params.set('intent', filterIntent);
      if (search) params.set('search', search);
      params.set('limit', '200');

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setIntentDist(data.intentDistribution || {});
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterGroup, filterIntent, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleClear = async () => {
    await fetch('/api/admin/logs', { method: 'DELETE', headers: { ...csrfHeaders() } });
    await fetchLogs();
    setShowClearConfirm(false);
  };

  const uniqueGroups = Array.from(new Set(logs.map((l) => l.groupId)));
  const uniqueIntents = Object.keys(intentDist).sort();

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Conversation Logs</h1>
          <p className="text-sm text-gray-500">{total} total conversations logged</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLogs} className="text-xs text-blue-600 hover:underline">Refresh</button>
          {total > 0 && (
            <button onClick={() => setShowClearConfirm(true)} className="text-xs text-red-500 hover:underline">Clear All</button>
          )}
        </div>
      </div>

      {/* Intent distribution summary */}
      {Object.keys(intentDist).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Intent Distribution</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(intentDist)
              .sort((a, b) => b[1] - a[1])
              .map(([intent, count]) => (
                <button
                  key={intent}
                  onClick={() => setFilterIntent(filterIntent === intent ? '' : intent)}
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterIntent === intent
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {intent} ({count})
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="">All groups</option>
          {uniqueGroups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          value={filterIntent}
          onChange={(e) => setFilterIntent(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="">All intents</option>
          {uniqueIntents.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search messages..."
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading logs...</p>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No conversation logs yet. Chat with the bot to generate logs.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium text-gray-500 w-36">Time</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">User Message</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 w-28">Intent</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500 w-20">Conf.</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 w-20">Group</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <>
                    <tr
                      key={i}
                      onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-gray-800 truncate max-w-xs">{log.userMessage}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600 font-medium">
                          {log.intent}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={`text-xs font-medium ${
                          log.confidence >= 0.8 ? 'text-green-600' :
                          log.confidence >= 0.5 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {(log.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">{log.groupId}</td>
                    </tr>
                    {expandedIdx === i && (
                      <tr key={`${i}-detail`} className="bg-gray-50 border-b border-gray-200">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-semibold text-gray-500 mb-1">User Message</div>
                              <div className="text-sm text-gray-800 bg-white rounded p-2 border border-gray-200">{log.userMessage}</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-500 mb-1">Bot Response</div>
                              <div className="text-sm text-gray-800 bg-white rounded p-2 border border-gray-200 whitespace-pre-wrap max-h-32 overflow-y-auto">{log.botResponse}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>Session: {log.sessionId}</span>
                            <span>Platform: {log.platform}</span>
                            {log.executionMs != null && <span>Execution: {log.executionMs}ms</span>}
                            {log.hasRichContent && <span className="text-blue-500">Has rich content</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showClearConfirm}
        title="Clear All Logs"
        message="Clear all conversation logs? This cannot be undone."
        confirmLabel="Clear All"
        variant="danger"
        onConfirm={handleClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
