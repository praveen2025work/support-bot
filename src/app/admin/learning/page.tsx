'use client';

import { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';

interface ReviewItem {
  id: string;
  timestamp: string;
  userMessage: string;
  detectedIntent: string;
  confidence: number;
  groupId: string;
  status: string;
}

interface AutoLearnedItem {
  id: string;
  timestamp: string;
  utterance: string;
  intent: string;
  positiveSignals: number;
  source: string;
}

interface LearningStats {
  totalInteractions: number;
  pendingReview: number;
  autoLearned: number;
  resolvedByAdmin: number;
  confidenceDistribution: { bucket: string; count: number }[];
  recentActivity: { date: string; interactions: number; learned: number }[];
}

type Tab = 'review' | 'auto-learned' | 'stats';

export default function LearningPage() {
  const [tab, setTab] = useState<Tab>('review');
  const [groupId, setGroupId] = useState('default');
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [autoLearned, setAutoLearned] = useState<AutoLearnedItem[]>([]);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [intents, setIntents] = useState<string[]>([]);
  const [selectedIntents, setSelectedIntents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const fetchReviewQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/learning/review?groupId=${groupId}&status=pending`);
      if (res.ok) setReviewItems(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [groupId]);

  const fetchAutoLearned = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/learning/auto-learned?groupId=${groupId}`);
      if (res.ok) setAutoLearned(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [groupId]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/learning/stats?groupId=${groupId}`);
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [groupId]);

  const fetchIntents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/intents');
      if (res.ok) {
        const data = await res.json();
        const intentList = (data.intents || data).map((i: { intent: string }) => i.intent);
        setIntents(intentList);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    fetchIntents();
  }, [fetchIntents]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data when tab/group changes
    if (tab === 'review') fetchReviewQueue();
    else if (tab === 'auto-learned') fetchAutoLearned();
    else if (tab === 'stats') fetchStats();
  }, [tab, groupId, fetchReviewQueue, fetchAutoLearned, fetchStats]);

  const resolveItem = async (id: string) => {
    const intent = selectedIntents[id];
    if (!intent) {
      setStatus('Please select an intent first');
      setTimeout(() => setStatus(''), 2000);
      return;
    }
    try {
      const res = await fetch(`/api/admin/learning/review/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ correctIntent: intent, groupId }),
      });
      if (res.ok) {
        setReviewItems((prev) => prev.filter((i) => i.id !== id));
        setStatus('Resolved and added to corpus');
        setTimeout(() => setStatus(''), 2000);
      }
    } catch { /* ignore */ }
  };

  const dismissItem = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/learning/review/${id}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) {
        setReviewItems((prev) => prev.filter((i) => i.id !== id));
        setStatus('Dismissed');
        setTimeout(() => setStatus(''), 2000);
      }
    } catch { /* ignore */ }
  };

  const triggerRetrain = async () => {
    try {
      const res = await fetch('/api/admin/learning/retrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) {
        setStatus('NLP retrain triggered — next message will use updated model');
        setTimeout(() => setStatus(''), 3000);
      }
    } catch { /* ignore */ }
  };

  const processSignals = async () => {
    try {
      const res = await fetch('/api/admin/learning/process-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(`Processed: ${data.promoted} promoted, ${data.queued} still queued`);
        setTimeout(() => setStatus(''), 3000);
        if (tab === 'stats') fetchStats();
        if (tab === 'auto-learned') fetchAutoLearned();
      }
    } catch { /* ignore */ }
  };

  const maxCount = stats
    ? Math.max(...stats.confidenceDistribution.map((b) => b.count), 1)
    : 1;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Learning</h1>
          <p className="text-sm text-gray-500">NLP self-improvement from user interactions</p>
        </div>
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="default">Default</option>
          <option value="finance">Finance</option>
          <option value="engineering">Engineering</option>
          <option value="analytics">Analytics</option>
        </select>
      </div>

      {status && (
        <div className="mb-4 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-md">{status}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['review', 'auto-learned', 'stats'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'review' ? 'Review Queue' : t === 'auto-learned' ? 'Auto-Learned' : 'Stats'}
          </button>
        ))}
      </div>

      {/* Review Queue Tab */}
      {tab === 'review' && (
        <div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : reviewItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg font-medium">No items pending review</p>
              <p className="text-sm mt-1">Low-confidence messages will appear here for labeling</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <p className="text-sm font-medium text-gray-900 mb-2">&ldquo;{item.userMessage}&rdquo;</p>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        Detected: <span className="font-mono text-gray-600">{item.detectedIntent}</span>
                      </span>
                      <span className={`text-xs font-medium ${item.confidence < 0.3 ? 'text-red-600' : 'text-yellow-600'}`}>
                        {(item.confidence * 100).toFixed(0)}% confidence
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={selectedIntents[item.id] || ''}
                        onChange={(e) => setSelectedIntents((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="border border-gray-300 rounded px-2 py-1 text-xs w-40"
                      >
                        <option value="">Select intent...</option>
                        {intents.map((intent) => (
                          <option key={intent} value={intent}>{intent}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => resolveItem(item.id)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => dismissItem(item.id)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Auto-Learned Tab */}
      {tab === 'auto-learned' && (
        <div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : autoLearned.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg font-medium">No auto-learned items yet</p>
              <p className="text-sm mt-1">Utterances will appear here once promoted from feedback signals</p>
            </div>
          ) : (
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium w-[35%]">Utterance</th>
                  <th className="pb-2 font-medium w-[22%]">Intent</th>
                  <th className="pb-2 font-medium w-[10%] text-center">Signals</th>
                  <th className="pb-2 font-medium w-[13%] text-center">Source</th>
                  <th className="pb-2 font-medium w-[20%]">Date</th>
                </tr>
              </thead>
              <tbody>
                {autoLearned.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-900 truncate">&ldquo;{item.utterance}&rdquo;</td>
                    <td className="py-2 font-mono text-xs text-gray-600">{item.intent}</td>
                    <td className="py-2 text-gray-600 text-center">{item.positiveSignals}</td>
                    <td className="py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        item.source === 'auto' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.source === 'auto' ? 'Auto' : 'Admin'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-400 text-xs">{new Date(item.timestamp).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div>
          {loading || !stats ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Interactions', value: stats.totalInteractions, color: 'text-gray-900' },
                  { label: 'Pending Review', value: stats.pendingReview, color: 'text-yellow-600' },
                  { label: 'Auto-Learned', value: stats.autoLearned, color: 'text-green-600' },
                  { label: 'Admin-Resolved', value: stats.resolvedByAdmin, color: 'text-blue-600' },
                ].map((card) => (
                  <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{card.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Confidence Distribution */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Confidence Distribution</h3>
                <div className="space-y-2">
                  {stats.confidenceDistribution.map((bucket) => (
                    <div key={bucket.bucket} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16 text-right font-mono">{bucket.bucket}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all"
                          style={{ width: `${(bucket.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-10 text-right">{bucket.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity (7 days)</h3>
                <div className="flex items-end gap-1 h-24">
                  {stats.recentActivity.map((day) => {
                    const maxInteractions = Math.max(...stats.recentActivity.map((d) => d.interactions), 1);
                    const height = (day.interactions / maxInteractions) * 100;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col items-center justify-end" style={{ height: '80px' }}>
                          <div
                            className="w-full bg-blue-400 rounded-t"
                            style={{ height: `${Math.max(height, 2)}%` }}
                            title={`${day.interactions} interactions, ${day.learned} learned`}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">{day.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={triggerRetrain}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Retrain NLP
                </button>
                <button
                  onClick={processSignals}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 border border-gray-300"
                >
                  Process Signals
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
