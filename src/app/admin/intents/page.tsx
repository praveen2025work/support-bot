'use client';

import { useState, useEffect } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface IntentData {
  intent: string;
  utterances: string[];
  answers: string[];
  utteranceCount: number;
}

interface EntityData {
  [entityType: string]: {
    options: { [key: string]: string[] };
  };
}

export default function IntentBuilderPage() {
  const [intents, setIntents] = useState<IntentData[]>([]);
  const [entities, setEntities] = useState<EntityData>({});
  const [loading, setLoading] = useState(true);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'intents' | 'entities'>('intents');

  // Intent edit state
  const [editUtterances, setEditUtterances] = useState('');
  const [editAnswers, setEditAnswers] = useState('');
  const [newUtterance, setNewUtterance] = useState('');
  const [saving, setSaving] = useState(false);

  // New intent state
  const [showNewIntent, setShowNewIntent] = useState(false);
  const [newIntentName, setNewIntentName] = useState('');
  const [newIntentUtterances, setNewIntentUtterances] = useState('');

  // Entity edit state
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [editSynonyms, setEditSynonyms] = useState('');
  const [deleteIntentTarget, setDeleteIntentTarget] = useState<string | null>(null);
  const [newOptionKey, setNewOptionKey] = useState('');
  const [newOptionSynonyms, setNewOptionSynonyms] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/intents');
      const data = await res.json();
      setIntents(data.intents || []);
      setEntities(data.entities || {});
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When selecting an intent, populate edit fields
  useEffect(() => {
    const intent = intents.find((i) => i.intent === selectedIntent);
    if (intent) {
      setEditUtterances(intent.utterances.join('\n'));
      setEditAnswers(intent.answers.join('\n---\n'));
    }
  }, [selectedIntent, intents]);

  // When selecting an entity option, populate edit fields
  useEffect(() => {
    if (selectedEntity && selectedOption && entities[selectedEntity]?.options[selectedOption]) {
      setEditSynonyms(entities[selectedEntity].options[selectedOption].join('\n'));
    }
  }, [selectedEntity, selectedOption, entities]);

  const handleSaveIntent = async () => {
    if (!selectedIntent) return;
    setSaving(true);
    try {
      const utterances = editUtterances.split('\n').map((u) => u.trim()).filter(Boolean);
      const answers = editAnswers.split('\n---\n').map((a) => a.trim()).filter(Boolean);
      await fetch('/api/admin/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ intent: selectedIntent, utterances, answers }),
      });
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleAddUtterance = () => {
    if (!newUtterance.trim()) return;
    setEditUtterances((prev) => prev + '\n' + newUtterance.trim());
    setNewUtterance('');
  };

  const handleCreateIntent = async () => {
    if (!newIntentName.trim() || !newIntentUtterances.trim()) return;
    setSaving(true);
    try {
      const utterances = newIntentUtterances.split('\n').map((u) => u.trim()).filter(Boolean);
      await fetch('/api/admin/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ intent: newIntentName.trim(), utterances, answers: [] }),
      });
      await fetchData();
      setShowNewIntent(false);
      setNewIntentName('');
      setNewIntentUtterances('');
      setSelectedIntent(newIntentName.trim());
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIntent = async (intent: string) => {
    await fetch(`/api/admin/intents?intent=${encodeURIComponent(intent)}`, { method: 'DELETE', headers: { ...csrfHeaders() } });
    setSelectedIntent(null);
    setDeleteIntentTarget(null);
    await fetchData();
  };

  const handleSaveEntity = async () => {
    if (!selectedEntity || !selectedOption) return;
    setSaving(true);
    try {
      const synonyms = editSynonyms.split('\n').map((s) => s.trim()).filter(Boolean);
      await fetch('/api/admin/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ entityType: selectedEntity, optionKey: selectedOption, synonyms }),
      });
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleAddEntityOption = async () => {
    if (!selectedEntity || !newOptionKey.trim() || !newOptionSynonyms.trim()) return;
    setSaving(true);
    try {
      const synonyms = newOptionSynonyms.split('\n').map((s) => s.trim()).filter(Boolean);
      await fetch('/api/admin/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ entityType: selectedEntity, optionKey: newOptionKey.trim(), synonyms }),
      });
      await fetchData();
      setNewOptionKey('');
      setNewOptionSynonyms('');
      setSelectedOption(newOptionKey.trim());
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading intents...</p>;

  const selected = intents.find((i) => i.intent === selectedIntent);
  const entityTypes = Object.keys(entities);

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Intent Builder</h1>
        <p className="text-sm text-gray-500">Manage intents, training phrases, and entity definitions</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['intents', 'entities'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'intents' ? `Intents (${intents.length})` : `Entities (${entityTypes.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'intents' && (
        <div className="flex gap-4">
          {/* Intent list */}
          <div className="w-64 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Intents</span>
              <button
                onClick={() => setShowNewIntent(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                + Add
              </button>
            </div>
            <div className="space-y-1">
              {intents.map((intent) => (
                <button
                  key={intent.intent}
                  onClick={() => { setSelectedIntent(intent.intent); setShowNewIntent(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedIntent === intent.intent
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <div className="font-medium">{intent.intent}</div>
                  <div className="text-xs text-gray-400">{intent.utteranceCount} phrases</div>
                </button>
              ))}
            </div>
          </div>

          {/* Intent detail panel */}
          <div className="flex-1 min-w-0">
            {showNewIntent ? (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Create New Intent</h2>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Intent Name</label>
                  <input
                    value={newIntentName}
                    onChange={(e) => setNewIntentName(e.target.value)}
                    placeholder="e.g. query.filter or product.info"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Training Phrases (one per line)</label>
                  <textarea
                    value={newIntentUtterances}
                    onChange={(e) => setNewIntentUtterances(e.target.value)}
                    rows={6}
                    placeholder={"show me the product details\nwhat are the product features\ntell me about @query_name"}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">Use @entity_name to reference entities (e.g., @query_name, @time_period)</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateIntent}
                    disabled={saving || !newIntentName.trim() || !newIntentUtterances.trim()}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Creating...' : 'Create Intent'}
                  </button>
                  <button
                    onClick={() => setShowNewIntent(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : selected ? (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-700">{selected.intent}</h2>
                    <span className="text-xs text-gray-400">{selected.utteranceCount} training phrases</span>
                  </div>
                  <button
                    onClick={() => setDeleteIntentTarget(selected.intent)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete Intent
                  </button>
                </div>

                {/* Training phrases */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Training Phrases</label>
                  <textarea
                    value={editUtterances}
                    onChange={(e) => setEditUtterances(e.target.value)}
                    rows={10}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      value={newUtterance}
                      onChange={(e) => setNewUtterance(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddUtterance()}
                      placeholder="Add new phrase..."
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5"
                    />
                    <button
                      onClick={handleAddUtterance}
                      className="text-xs px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Use @entity_name for entity references. One phrase per line.</p>
                </div>

                {/* Answers */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Answers (separated by ---){' '}
                    <span className="text-gray-400 font-normal">Optional: used for static intents like greeting/help</span>
                  </label>
                  <textarea
                    value={editAnswers}
                    onChange={(e) => setEditAnswers(e.target.value)}
                    rows={4}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Answer text here..."
                  />
                </div>

                <button
                  onClick={handleSaveIntent}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-500">Select an intent from the list or create a new one.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'entities' && (
        <div className="flex gap-4">
          {/* Entity type list */}
          <div className="w-48 shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Entity Types</span>
            <div className="space-y-1">
              {entityTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => { setSelectedEntity(type); setSelectedOption(null); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedEntity === type
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <div className="font-medium">{type}</div>
                  <div className="text-xs text-gray-400">
                    {Object.keys(entities[type]?.options || {}).length} options
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Options list + editor */}
          {selectedEntity ? (
            <>
              <div className="w-52 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">{selectedEntity}</span>
                </div>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {Object.entries(entities[selectedEntity]?.options || {}).map(([key, synonyms]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedOption(key)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedOption === key
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-100 border border-transparent'
                      }`}
                    >
                      <div className="font-mono text-xs">{key}</div>
                      <div className="text-[10px] text-gray-400">{(synonyms as string[]).length} synonyms</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {selectedOption ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      {selectedEntity} &rarr; {selectedOption}
                    </h3>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Synonyms (one per line)</label>
                      <textarea
                        value={editSynonyms}
                        onChange={(e) => setEditSynonyms(e.target.value)}
                        rows={8}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                      />
                    </div>
                    <button
                      onClick={handleSaveEntity}
                      disabled={saving}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Synonyms'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Add New Option</h3>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Option Key</label>
                      <input
                        value={newOptionKey}
                        onChange={(e) => setNewOptionKey(e.target.value)}
                        placeholder="e.g. new_query_name"
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Synonyms (one per line)</label>
                      <textarea
                        value={newOptionSynonyms}
                        onChange={(e) => setNewOptionSynonyms(e.target.value)}
                        rows={4}
                        placeholder={"my query\nmy query name\nalternative name"}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                      />
                    </div>
                    <button
                      onClick={handleAddEntityOption}
                      disabled={saving || !newOptionKey.trim() || !newOptionSynonyms.trim()}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Adding...' : 'Add Option'}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">Select an entity type from the list to view and edit its options.</p>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={!!deleteIntentTarget}
        title="Delete Intent"
        message={deleteIntentTarget ? `Delete intent "${deleteIntentTarget}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteIntentTarget) handleDeleteIntent(deleteIntentTarget); }}
        onCancel={() => setDeleteIntentTarget(null)}
      />
    </div>
  );
}
