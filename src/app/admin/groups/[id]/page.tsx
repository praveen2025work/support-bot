'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { csrfHeaders } from '@/lib/csrf';
import { EmbedCodeGenerator } from '../../components/EmbedCodeGenerator';

interface GroupDetail {
  id: string;
  name: string;
  description: string;
  sources: string[];
  apiBaseUrl: string | null;
  templates: {
    greeting?: string[];
    help?: string[];
    farewell?: string[];
    unknown?: string[];
  } | null;
  corpus: string | null;
  faq: string | null;
}

interface FilterBinding {
  key: string;
  binding: 'body' | 'query_param' | 'path';
}

interface FilterConfig {
  label: string;
  type: string;
}

interface QueryRecord {
  id: string;
  name: string;
  description: string;
  source: string;
  url: string;
  filters: FilterBinding[];
  estimatedDuration: number;
  type: 'api' | 'url' | 'document' | 'csv';
  filePath?: string;
  endpoint?: string;
  authType?: 'none' | 'bearer' | 'windows' | 'bam';
  bamTokenUrl?: string;
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'settings' | 'embed'>('settings');

  // Editable group fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourcesText, setSourcesText] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [greeting, setGreeting] = useState('');
  const [helpText, setHelpText] = useState('');

  // Query management
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [showAddQuery, setShowAddQuery] = useState(false);
  const [editingQueryId, setEditingQueryId] = useState<string | null>(null);
  const [qName, setQName] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qSource, setQSource] = useState('');
  const [qUrl, setQUrl] = useState('');
  const [qFilterBindings, setQFilterBindings] = useState<FilterBinding[]>([]);
  const [qSaving, setQSaving] = useState(false);
  const [qError, setQError] = useState('');
  const [qSuccess, setQSuccess] = useState('');
  const [deletingQueryId, setDeletingQueryId] = useState<string | null>(null);
  const [qType, setQType] = useState<'api' | 'url' | 'document' | 'csv'>('api');
  const [qFilePath, setQFilePath] = useState('');
  const [qEndpoint, setQEndpoint] = useState('');
  const [qAuthType, setQAuthType] = useState<'none' | 'bearer' | 'windows' | 'bam'>('none');
  const [qBamTokenUrl, setQBamTokenUrl] = useState('');
  const [customFilterKey, setCustomFilterKey] = useState('');
  const [customFilterBinding, setCustomFilterBinding] = useState<'body' | 'query_param' | 'path'>('body');

  // Available filter configs from admin
  const [availableFilters, setAvailableFilters] = useState<Record<string, FilterConfig>>({});

  const fetchQueries = async (sources: string[]) => {
    try {
      const sourceParam = sources.length > 0 ? sources.join(',') : '';
      const url = sourceParam
        ? `/api/admin/queries?source=${encodeURIComponent(sourceParam)}`
        : '/api/admin/queries';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQueries(data.queries);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const [groupRes, filtersRes] = await Promise.all([
          fetch(`/api/admin/groups/${id}`),
          fetch('/api/filters'),
        ]);
        if (groupRes.ok) {
          const data = await groupRes.json();
          setGroup(data);
          setName(data.name);
          setDescription(data.description);
          setSourcesText(data.sources.join(', '));
          setApiBaseUrl(data.apiBaseUrl || '');
          setGreeting(data.templates?.greeting?.[0] || '');
          setHelpText(data.templates?.help?.[0] || '');
          await fetchQueries(data.sources);
        }
        if (filtersRes.ok) {
          const fData = await filtersRes.json();
          setAvailableFilters(fData.filters || {});
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const sources = sourcesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const templates: Record<string, string[]> = {};
      if (greeting.trim()) templates.greeting = [greeting.trim()];
      if (helpText.trim()) templates.help = [helpText.trim()];

      const res = await fetch(`/api/admin/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          name,
          description,
          sources,
          apiBaseUrl: apiBaseUrl.trim() || null,
          templates: Object.keys(templates).length > 0 ? templates : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGroup(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/groups/${id}`, { method: 'DELETE', headers: { ...csrfHeaders() } });
      if (res.ok) {
        router.push('/admin');
      }
    } catch {
      setDeleting(false);
    }
  };

  // Query CRUD
  const resetQueryForm = () => {
    setQName('');
    setQDesc('');
    setQSource('');
    setQUrl('');
    setQType('api');
    setQFilePath('');
    setQEndpoint('');
    setQAuthType('none');
    setQBamTokenUrl('');
    setQFilterBindings([]);
    setCustomFilterKey('');
    setCustomFilterBinding('body');
    setShowAddQuery(false);
    setEditingQueryId(null);
    setSelectedQueryId(null);
    setQError('');
  };

  const startEditQuery = (q: QueryRecord) => {
    setQName(q.name || '');
    setQDesc(q.description || '');
    setQSource(q.source || '');
    setQUrl(q.url || '');
    setQType(q.type || 'api');
    setQFilePath(q.filePath || '');
    setQEndpoint(q.endpoint || '');
    setQAuthType(q.authType || 'none');
    setQBamTokenUrl(q.bamTokenUrl || '');
    setQFilterBindings((q.filters || []).map((f) => ({ ...f })));
    setEditingQueryId(q.id);
    setSelectedQueryId(q.id);
    setShowAddQuery(true);
    setQError('');
    setQSuccess('');
  };

  const startAddQuery = () => {
    setQName('');
    setQDesc('');
    setQSource(group?.sources?.[0] || '');
    setQUrl('');
    setQType('api');
    setQFilePath('');
    setQEndpoint('');
    setQAuthType('none');
    setQBamTokenUrl('');
    setQFilterBindings([]);
    setCustomFilterKey('');
    setCustomFilterBinding('body');
    setEditingQueryId(null);
    setSelectedQueryId(null);
    setShowAddQuery(true);
    setQError('');
    setQSuccess('');
  };

  const toggleFilter = (key: string, checked: boolean) => {
    if (checked) {
      setQFilterBindings((prev) => [...prev, { key, binding: 'body' }]);
    } else {
      setQFilterBindings((prev) => prev.filter((f) => f.key !== key));
    }
  };

  const updateBinding = (key: string, binding: 'body' | 'query_param' | 'path') => {
    setQFilterBindings((prev) =>
      prev.map((f) => (f.key === key ? { ...f, binding } : f))
    );
  };

  const addCustomFilter = () => {
    const key = customFilterKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || qFilterBindings.some((f) => f.key === key)) return;
    setQFilterBindings((prev) => [...prev, { key, binding: customFilterBinding }]);
    setCustomFilterKey('');
    setCustomFilterBinding('body');
  };

  const removeFilter = (key: string) => {
    setQFilterBindings((prev) => prev.filter((f) => f.key !== key));
  };

  const handleSaveQuery = async () => {
    if (!(qName || '').trim() || !(qSource || '').trim()) {
      setQError('Query name and source are required.');
      return;
    }
    if (qType === 'url' && !(qUrl || '').trim()) {
      setQError('URL is required for URL-type queries.');
      return;
    }
    if ((qType === 'document' || qType === 'csv') && !(qFilePath || '').trim()) {
      setQError('File path is required for Document/CSV-type queries.');
      return;
    }
    if (qType === 'api' && !(qEndpoint || '').trim()) {
      setQError('API Endpoint is required for API-type queries.');
      return;
    }
    if (qAuthType === 'bam' && !(qBamTokenUrl || '').trim()) {
      setQError('BAM Token URL is required when Auth Type is BAM.');
      return;
    }
    setQSaving(true);
    setQError('');
    try {
      const payload = {
        name: (qName || '').trim(),
        description: (qDesc || '').trim(),
        source: (qSource || '').trim(),
        url: (qUrl || '').trim(),
        filters: qType === 'api' ? qFilterBindings : [],
        type: qType,
        filePath: (qType === 'document' || qType === 'csv') ? (qFilePath || '').trim() : '',
        endpoint: qType === 'api' ? (qEndpoint || '').trim() : '',
        authType: qType === 'api' ? qAuthType : 'none',
        bamTokenUrl: qAuthType === 'bam' ? (qBamTokenUrl || '').trim() : '',
      };

      if (editingQueryId) {
        const res = await fetch('/api/admin/queries', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
          body: JSON.stringify({ id: editingQueryId, ...payload }),
        });
        if (!res.ok) {
          const data = await res.json();
          setQError(data.error || 'Failed to update query');
          return;
        }
      } else {
        const res = await fetch('/api/admin/queries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          setQError(data.error || 'Failed to create query');
          return;
        }
      }

      const wasEditing = !!editingQueryId;
      resetQueryForm();
      if (group) await fetchQueries(group.sources);
      setQSuccess(wasEditing ? 'Query updated successfully!' : 'Query created successfully!');
      setTimeout(() => setQSuccess(''), 5000);
    } catch (err) {
      console.error('Save query error:', err);
      setQError(`Failed to save query: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setQSaving(false);
    }
  };

  const handleDeleteQuery = async (queryId: string) => {
    try {
      const res = await fetch(`/api/admin/queries?id=${queryId}`, { method: 'DELETE', headers: { ...csrfHeaders() } });
      if (res.ok && group) {
        await fetchQueries(group.sources);
        if (selectedQueryId === queryId) {
          resetQueryForm();
        }
      }
      setDeletingQueryId(null);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading group...</p>;
  }

  if (!group) {
    return (
      <div>
        <p className="text-sm text-red-600 mb-4">Group not found.</p>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Groups
        </Link>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    api: 'bg-blue-100 text-blue-700',
    url: 'bg-green-100 text-green-700',
    document: 'bg-amber-100 text-amber-700',
    csv: 'bg-teal-100 text-teal-700',
  };

  return (
    <div className="max-w-[1600px]">
      {/* Header */}
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Groups
        </Link>
      </div>
      <div className="flex items-baseline gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
        <span className="text-sm text-gray-400 font-mono">{id}</span>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Group Settings
        </button>
        <button
          onClick={() => setActiveTab('embed')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'embed'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Embed Code
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'settings' ? (
        <>
          {/* Compact Settings Form */}
          <section className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Sources <span className="text-gray-400 font-normal">(comma-sep)</span>
                </label>
                <input
                  value={sourcesText}
                  onChange={(e) => setSourcesText(e.target.value)}
                  placeholder="e.g. finance, commerce"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                API Base URL <span className="text-gray-400 font-normal">(backend REST endpoint)</span>
              </label>
              <input
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="e.g. http://localhost:8080 or https://api.example.com"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Greeting Template</label>
                <textarea
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Help Template</label>
                <textarea
                  value={helpText}
                  onChange={(e) => setHelpText(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saved && <span className="text-xs text-green-600">Saved!</span>}
            </div>
          </section>

          {/* Queries: Master-Detail */}
          <section className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">
                Queries ({queries.length})
              </h2>
              <button
                onClick={startAddQuery}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                + Add Query
              </button>
            </div>

            {qSuccess && (
              <p className="text-xs text-green-600 mb-3 flex items-center gap-1">
                <span className="inline-block w-4 h-4 bg-green-100 text-green-600 rounded-full text-center leading-4 text-[10px] font-bold">✓</span>
                {qSuccess}
              </p>
            )}

            <div className="flex gap-4" style={{ minHeight: '400px' }}>
              {/* Left: Query List */}
              <div className="w-[280px] flex-shrink-0 border-r border-gray-100 pr-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
                {queries.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4">No queries found.</p>
                ) : (
                  <div className="space-y-1">
                    {queries.map((q) => (
                      <div key={q.id} className="relative group">
                        <button
                          onClick={() => startEditQuery(q)}
                          className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            selectedQueryId === q.id
                              ? 'bg-blue-50 border border-blue-200'
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-gray-800 truncate">{q.name}</span>
                              <span className={`inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium ${typeColors[q.type || 'api']}`}>
                                {(q.type || 'api').toUpperCase()}
                              </span>
                            </div>
                            {q.description && (
                              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{q.description}</p>
                            )}
                          </div>
                          {q.filters.length > 0 && (
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                              {q.filters.length}f
                            </span>
                          )}
                        </button>
                        {/* Delete inline */}
                        {deletingQueryId === q.id ? (
                          <div className="absolute right-1 top-1 flex items-center gap-1 bg-white rounded shadow-sm border border-gray-200 px-2 py-1 z-10">
                            <button
                              onClick={() => handleDeleteQuery(q.id)}
                              className="text-[10px] text-red-600 font-medium hover:underline"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingQueryId(null)}
                              className="text-[10px] text-gray-500 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingQueryId(q.id); }}
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-600 transition-opacity"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Edit/Add Form */}
              <div className="flex-1 min-w-0">
                {showAddQuery ? (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-600 mb-3">
                      {editingQueryId ? 'Edit Query' : 'New Query'}
                    </h3>
                    {qError && <p className="text-xs text-red-600 mb-2">{qError}</p>}

                    {/* Query Type */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Query Type</label>
                      <select
                        value={qType}
                        onChange={(e) => setQType(e.target.value as 'api' | 'url' | 'document' | 'csv')}
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="api">API (REST endpoint)</option>
                        <option value="url">URL (return link)</option>
                        <option value="document">Document (BRD / feature doc)</option>
                        <option value="csv">CSV (data analysis)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input
                        value={qName}
                        onChange={(e) => setQName(e.target.value)}
                        placeholder="Query name (e.g. monthly_revenue)"
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        value={qDesc}
                        onChange={(e) => setQDesc(e.target.value)}
                        placeholder="Description"
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <select
                        value={qSource}
                        onChange={(e) => setQSource(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select source...</option>
                        {(group?.sources || []).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {qType === 'url' && (
                        <input
                          value={qUrl}
                          onChange={(e) => setQUrl(e.target.value)}
                          placeholder="URL to return (required)"
                          className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      )}
                      {(qType === 'document' || qType === 'csv') && (
                        <input
                          value={qFilePath}
                          onChange={(e) => setQFilePath(e.target.value)}
                          placeholder={qType === 'csv' ? 'CSV file path (e.g. data/sales-data.csv)' : 'Document path (e.g. data/knowledge/brd.md)'}
                          className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      )}
                    </div>

                    {/* API Endpoint — only for API type */}
                    {qType === 'api' && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          API Endpoint <span className="text-red-400 font-normal">*</span>
                        </label>
                        <input
                          value={qEndpoint}
                          onChange={(e) => setQEndpoint(e.target.value)}
                          placeholder="e.g. /users/{user_id}/profile  or  /queries/q1/execute"
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          REST path for this query. Use &#123;filter_key&#125; for path variables.
                        </p>
                      </div>
                    )}

                    {/* Auth Type — only for API type */}
                    {qType === 'api' && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Auth Type
                        </label>
                        <select
                          value={qAuthType}
                          onChange={(e) => setQAuthType(e.target.value as 'none' | 'bearer' | 'windows' | 'bam')}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="none">None (default — uses global API_TOKEN)</option>
                          <option value="bearer">Bearer (global API_TOKEN from env)</option>
                          <option value="windows">Windows Auth (forwards user AD credentials)</option>
                          <option value="bam">BAM Token (fetches token from BAM URL)</option>
                        </select>
                        <p className="text-xs text-gray-400 mt-1">
                          {qAuthType === 'windows' && 'User\'s AD cookies & auth headers are forwarded to the API.'}
                          {qAuthType === 'bam' && 'Engine calls BAM Token URL first, then uses the token for the data API call.'}
                          {(qAuthType === 'none' || qAuthType === 'bearer') && 'Uses the global API_TOKEN from environment variables.'}
                        </p>
                      </div>
                    )}

                    {/* BAM Token URL — only when authType is bam */}
                    {qType === 'api' && qAuthType === 'bam' && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          BAM Token URL <span className="text-red-400 font-normal">*</span>
                        </label>
                        <input
                          value={qBamTokenUrl}
                          onChange={(e) => setQBamTokenUrl(e.target.value)}
                          placeholder="e.g. https://auth.your-company.com/bam/token"
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          POST endpoint that returns &#123; code, message, bamToken, redirectURL &#125;
                        </p>
                      </div>
                    )}

                    {/* Reference / Docs URL — for all types except url (which already has the URL field) */}
                    {qType !== 'url' && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Reference / Docs URL
                        </label>
                        <input
                          value={qUrl}
                          onChange={(e) => setQUrl(e.target.value)}
                          placeholder="e.g. https://confluence.example.com/wiki/monthly-revenue-report"
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Confluence or docs page link for more information about this query.
                        </p>
                      </div>
                    )}

                    {/* Filter Picker — only for API type */}
                    {qType === 'api' && (
                      <div className="mb-3">
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Filters</label>
                        <div className="space-y-1.5">
                          {Object.entries(availableFilters).map(([key, config]) => {
                            const selected = qFilterBindings.find((f) => f.key === key);
                            return (
                              <div key={key} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={!!selected}
                                  onChange={(e) => toggleFilter(key, e.target.checked)}
                                  className="accent-blue-600"
                                />
                                <span className="text-xs text-gray-700 min-w-[140px]">
                                  {config.label} <span className="text-gray-400 font-mono">({key})</span>
                                </span>
                                {selected && (
                                  <select
                                    value={selected.binding}
                                    onChange={(e) => updateBinding(key, e.target.value as FilterBinding['binding'])}
                                    className="text-xs border border-gray-300 rounded px-1.5 py-0.5 bg-white"
                                  >
                                    <option value="body">Body</option>
                                    <option value="query_param">Query Param</option>
                                    <option value="path">Path Variable</option>
                                  </select>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Custom filters not in configured list */}
                        {qFilterBindings
                          .filter((f) => !availableFilters[f.key])
                          .map((f) => (
                            <div key={f.key} className="flex items-center gap-2 mt-1.5">
                              <input type="checkbox" checked readOnly className="accent-blue-600" />
                              <span className="text-xs text-gray-700 min-w-[140px] font-mono">{f.key}</span>
                              <select
                                value={f.binding}
                                onChange={(e) => updateBinding(f.key, e.target.value as FilterBinding['binding'])}
                                className="text-xs border border-gray-300 rounded px-1.5 py-0.5 bg-white"
                              >
                                <option value="body">Body</option>
                                <option value="query_param">Query Param</option>
                                <option value="path">Path Variable</option>
                              </select>
                              <button onClick={() => removeFilter(f.key)} className="text-xs text-red-400 hover:text-red-600">
                                Remove
                              </button>
                            </div>
                          ))}

                        {/* Add custom filter */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">+</span>
                          <input
                            value={customFilterKey}
                            onChange={(e) => setCustomFilterKey(e.target.value)}
                            placeholder="Custom filter key"
                            className="text-xs border border-gray-300 rounded px-2 py-1 w-[140px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomFilter(); } }}
                          />
                          <select
                            value={customFilterBinding}
                            onChange={(e) => setCustomFilterBinding(e.target.value as FilterBinding['binding'])}
                            className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                          >
                            <option value="body">Body</option>
                            <option value="query_param">Query Param</option>
                            <option value="path">Path Variable</option>
                          </select>
                          <button
                            onClick={addCustomFilter}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleSaveQuery}
                        disabled={qSaving}
                        className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {qSaving ? 'Saving...' : editingQueryId ? 'Update' : 'Add'}
                      </button>
                      <button
                        onClick={resetQueryForm}
                        className="px-4 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-gray-400">
                    Select a query to edit, or click &quot;+ Add Query&quot;
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : (
        /* Embed Code Tab */
        <section className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Embed Code</h2>
          <p className="text-xs text-gray-500 mb-3">
            Use this HTML snippet to embed the chatbot widget in any page.
          </p>
          <EmbedCodeGenerator groupId={id} />
        </section>
      )}

      {/* Danger Zone — always visible */}
      {id !== 'default' && (
        <section className="bg-white rounded-lg border border-red-200 p-5 mt-6">
          <h2 className="text-sm font-semibold text-red-700 mb-2">Danger Zone</h2>
          {confirmDelete ? (
            <div>
              <p className="text-xs text-gray-600 mb-3">
                This will permanently delete the group config, corpus, and FAQ files. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete Group
            </button>
          )}
        </section>
      )}
    </div>
  );
}
