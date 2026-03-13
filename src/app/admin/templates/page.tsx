'use client';

import { useState, useEffect } from 'react';
import { csrfHeaders } from '@/lib/csrf';

export default function TemplateEditorPage() {
  const [baseTemplates, setBaseTemplates] = useState<Record<string, string[]>>({});
  const [groupTemplates, setGroupTemplates] = useState<Record<string, Record<string, string[]>>>({});
  const [loading, setLoading] = useState(true);
  const [activeScope, setActiveScope] = useState('base');
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [editResponses, setEditResponses] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newIntent, setNewIntent] = useState('');
  const [newResponses, setNewResponses] = useState('');

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/templates');
      const data = await res.json();
      setBaseTemplates(data.baseTemplates || {});
      setGroupTemplates(data.groupTemplates || {});
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const currentTemplates = activeScope === 'base'
    ? baseTemplates
    : groupTemplates[activeScope] || {};

  const allScopes = ['base', ...Object.keys(groupTemplates)];
  const intentKeys = Object.keys(currentTemplates);

  useEffect(() => {
    if (selectedIntent && currentTemplates[selectedIntent]) {
      setEditResponses(currentTemplates[selectedIntent].join('\n---\n'));
    }
  }, [selectedIntent, activeScope, currentTemplates]);

  const handleSave = async () => {
    if (!selectedIntent) return;
    setSaving(true);
    try {
      const responses = editResponses.split('\n---\n').map((r) => r.trim()).filter(Boolean);
      await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ scope: activeScope, intent: selectedIntent, responses }),
      });
      await fetchTemplates();
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newIntent.trim() || !newResponses.trim()) return;
    setSaving(true);
    try {
      const responses = newResponses.split('\n---\n').map((r) => r.trim()).filter(Boolean);
      await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ scope: activeScope, intent: newIntent.trim(), responses }),
      });
      await fetchTemplates();
      setShowNew(false);
      setNewIntent('');
      setNewResponses('');
      setSelectedIntent(newIntent.trim());
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (intent: string) => {
    if (!confirm(`Delete template "${intent}" from ${activeScope}?`)) return;
    await fetch(`/api/admin/templates?scope=${activeScope}&intent=${encodeURIComponent(intent)}`, { method: 'DELETE', headers: { ...csrfHeaders() } });
    setSelectedIntent(null);
    await fetchTemplates();
  };

  if (loading) return <p className="text-sm text-gray-500">Loading templates...</p>;

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Template Editor</h1>
        <p className="text-sm text-gray-500">Manage response templates for bot intents. Group-specific templates override base templates.</p>
      </div>

      {/* Scope selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium text-gray-500">Scope:</span>
        {allScopes.map((scope) => (
          <button
            key={scope}
            onClick={() => { setActiveScope(scope); setSelectedIntent(null); setShowNew(false); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeScope === scope
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {scope === 'base' ? 'Base (Default)' : scope}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Intent list */}
        <div className="w-52 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Templates</span>
            <button
              onClick={() => { setShowNew(true); setSelectedIntent(null); }}
              className="text-xs text-blue-600 hover:underline"
            >
              + Add
            </button>
          </div>
          <div className="space-y-1">
            {intentKeys.map((intent) => (
              <button
                key={intent}
                onClick={() => { setSelectedIntent(intent); setShowNew(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedIntent === intent
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 border border-transparent'
                }`}
              >
                <div className="font-medium">{intent}</div>
                <div className="text-xs text-gray-400">
                  {currentTemplates[intent]?.length || 0} response{currentTemplates[intent]?.length !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
            {intentKeys.length === 0 && (
              <p className="text-xs text-gray-400 px-3 py-2">
                {activeScope === 'base' ? 'No base templates defined' : 'No overrides for this group'}
              </p>
            )}
          </div>
        </div>

        {/* Editor panel */}
        <div className="flex-1 min-w-0">
          {showNew ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">New Template ({activeScope})</h2>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Intent</label>
                <input
                  value={newIntent}
                  onChange={(e) => setNewIntent(e.target.value)}
                  placeholder="e.g. greeting, help, error"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Responses (separate multiple with ---)
                </label>
                <textarea
                  value={newResponses}
                  onChange={(e) => setNewResponses(e.target.value)}
                  rows={8}
                  placeholder={"Hello! How can I help you today?\n---\nHi there! What would you like to know?"}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-400 mt-1">
                  The bot randomly picks one response. Use \n for newlines in a single response.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={saving || !newIntent.trim() || !newResponses.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Template'}
                </button>
                <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              </div>
            </div>
          ) : selectedIntent ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-700">{selectedIntent}</h2>
                  <span className="text-xs text-gray-400">Scope: {activeScope}</span>
                </div>
                <button onClick={() => handleDelete(selectedIntent)} className="text-xs text-red-500 hover:underline">
                  Delete
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Responses (separate multiple with ---)
                </label>
                <textarea
                  value={editResponses}
                  onChange={(e) => setEditResponses(e.target.value)}
                  rows={12}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-400 mt-1">The bot randomly selects one of these responses when this intent is matched.</p>
              </div>

              {/* Preview */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 mb-2">Preview</div>
                {editResponses.split('\n---\n').filter(Boolean).map((resp, i) => (
                  <div key={i} className="mb-2 last:mb-0">
                    <span className="text-[10px] text-gray-400">Response {i + 1}:</span>
                    <div className="text-sm text-gray-700 bg-white rounded p-2 mt-0.5 whitespace-pre-wrap">{resp.trim()}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">Select a template to edit or create a new one.</p>
              <p className="text-xs text-gray-400 mt-2">
                {activeScope !== 'base'
                  ? `Group "${activeScope}" templates override base templates when matched.`
                  : 'Base templates are used when no group-specific override exists.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
