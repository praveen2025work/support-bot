'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardForm } from '@/components/admin/OnboardForm';
import Link from 'next/link';

type Tab = 'manual' | 'excel';

interface QueryRow {
  name: string;
  description: string;
  source: string;
  url: string;
  filters: string;
}

export default function AdminOnboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('manual');

  // Manual form state
  const [groupId, setGroupId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourcesText, setSourcesText] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [greeting, setGreeting] = useState('');
  const [helpText, setHelpText] = useState('');
  const [queries, setQueries] = useState<QueryRow[]>([
    { name: '', description: '', source: '', url: '', filters: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addQueryRow = () => {
    setQueries([...queries, { name: '', description: '', source: '', url: '', filters: '' }]);
  };

  const removeQueryRow = (idx: number) => {
    setQueries(queries.filter((_, i) => i !== idx));
  };

  const updateQuery = (idx: number, field: keyof QueryRow, value: string) => {
    const updated = [...queries];
    updated[idx] = { ...updated[idx], [field]: value };
    setQueries(updated);
  };

  const handleManualSubmit = async () => {
    if (!groupId.trim() || !name.trim()) {
      setError('Group ID and Name are required.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(groupId.trim())) {
      setError('Group ID must be lowercase alphanumeric with underscores only.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const validQueries = queries.filter((q) => q.name.trim());
      const sources = sourcesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: groupId.trim(),
          name: name.trim(),
          description: description.trim(),
          sources,
          apiBaseUrl: apiBaseUrl.trim() || null,
          greeting: greeting.trim(),
          helpText: helpText.trim(),
          queries: validQueries.map((q) => ({
            name: q.name.trim(),
            description: q.description.trim(),
            source: q.source.trim(),
            url: q.url.trim(),
            estimated_duration: 2000,
            filters: q.filters.trim(),
          })),
          faq: [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create group');
        return;
      }

      router.push(`/admin/groups/${data.groupId}`);
    } catch {
      setError('Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Groups
        </Link>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-1">Add New Group</h1>
      <p className="text-sm text-gray-500 mb-6">
        Create a new chatbot group manually or by uploading an Excel template.
      </p>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setTab('manual')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'manual'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Manual Setup
        </button>
        <button
          onClick={() => setTab('excel')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'excel'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Excel Upload
        </button>
      </div>

      {tab === 'excel' ? (
        <OnboardForm
          backUrl="/admin"
          successUrl={(gid) => `/admin/groups/${gid}`}
        />
      ) : (
        <div>
          {error && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Group Info */}
          <section className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Group Info</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Group ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    placeholder="e.g. finance_team"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Lowercase, underscores only</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Finance Bot"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this bot helps with"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Sources <span className="text-gray-400 font-normal">(comma-separated)</span>
                  </label>
                  <input
                    value={sourcesText}
                    onChange={(e) => setSourcesText(e.target.value)}
                    placeholder="e.g. finance, commerce"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    API Base URL <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    placeholder="http://localhost:8080"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Greeting</label>
                <textarea
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  rows={2}
                  placeholder="Hello! I'm the Finance Bot. How can I help?"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Help Text</label>
                <textarea
                  value={helpText}
                  onChange={(e) => setHelpText(e.target.value)}
                  rows={3}
                  placeholder="I can help you with..."
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Queries */}
          <section className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Queries</h2>
              <button
                onClick={addQueryRow}
                className="text-xs text-blue-600 hover:underline"
              >
                + Add Query
              </button>
            </div>
            <div className="space-y-3">
              {queries.map((q, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <input
                      value={q.name}
                      onChange={(e) => updateQuery(idx, 'name', e.target.value)}
                      placeholder="Query name (e.g. monthly_revenue)"
                      className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      value={q.description}
                      onChange={(e) => updateQuery(idx, 'description', e.target.value)}
                      placeholder="Description"
                      className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      value={q.source}
                      onChange={(e) => updateQuery(idx, 'source', e.target.value)}
                      placeholder="Source (e.g. finance)"
                      className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      value={q.url}
                      onChange={(e) => updateQuery(idx, 'url', e.target.value)}
                      placeholder="Dashboard URL"
                      className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <input
                        value={q.filters}
                        onChange={(e) => updateQuery(idx, 'filters', e.target.value)}
                        placeholder="Filters (e.g. date_range, region)"
                        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {queries.length > 1 && (
                        <button
                          onClick={() => removeQueryRow(idx)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Filters: use known types (date_range, region, environment, team) for dropdowns, or any custom name for text input fields.
            </p>
          </section>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualSubmit}
              disabled={saving}
              className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating...' : 'Create Group'}
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
