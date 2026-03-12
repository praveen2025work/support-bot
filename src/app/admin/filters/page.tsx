'use client';

import { useState, useEffect } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterEntry {
  label: string;
  type: 'select' | 'text' | 'boolean';
  options: FilterOption[];
  placeholder: string | null;
}

export default function FiltersPage() {
  const [filters, setFilters] = useState<Record<string, FilterEntry>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formType, setFormType] = useState<'select' | 'text' | 'boolean'>('select');
  const [formPlaceholder, setFormPlaceholder] = useState('');
  const [formOptions, setFormOptions] = useState<FilterOption[]>([{ value: '', label: '' }]);

  const fetchFilters = async () => {
    try {
      const res = await fetch('/api/admin/filters');
      const data = await res.json();
      setFilters(data.filters || {});
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  const resetForm = () => {
    setFormKey('');
    setFormLabel('');
    setFormType('select');
    setFormPlaceholder('');
    setFormOptions([{ value: '', label: '' }]);
    setEditingKey(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (key: string, entry: FilterEntry) => {
    setFormKey(key);
    setFormLabel(entry.label);
    setFormType(entry.type);
    setFormPlaceholder(entry.placeholder || '');
    setFormOptions(
      entry.options.length > 0
        ? entry.options
        : [{ value: '', label: '' }]
    );
    setEditingKey(key);
    setShowForm(true);
    setError('');
  };

  const addOption = () => {
    setFormOptions([...formOptions, { value: '', label: '' }]);
  };

  const removeOption = (idx: number) => {
    setFormOptions(formOptions.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, field: 'value' | 'label', val: string) => {
    const updated = [...formOptions];
    updated[idx] = { ...updated[idx], [field]: val };
    setFormOptions(updated);
  };

  const handleSave = async () => {
    if (!formKey.trim() || !formLabel.trim()) {
      setError('Key and label are required.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(formKey.trim())) {
      setError('Key must be lowercase alphanumeric with underscores only.');
      return;
    }
    if (formType === 'select') {
      const validOptions = formOptions.filter((o) => o.value.trim() && o.label.trim());
      if (validOptions.length === 0) {
        setError('Select type requires at least one option with value and label.');
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      const validOptions = formOptions.filter((o) => o.value.trim() && o.label.trim());
      const res = await fetch('/api/admin/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: formKey.trim(),
          label: formLabel.trim(),
          type: formType,
          options: formType === 'select' ? validOptions : [],
          placeholder: formType === 'text' ? formPlaceholder.trim() || null : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save filter');
        return;
      }

      resetForm();
      fetchFilters();
    } catch {
      setError('Failed to save filter');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      const res = await fetch(`/api/admin/filters?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchFilters();
      }
      setDeletingKey(null);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading filter options...</p>;
  }

  const filterEntries = Object.entries(filters);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Filter Options</h1>
          <p className="text-sm text-gray-500">
            Configure which filters show as dropdowns, text inputs, or true/false toggles
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Filter
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 p-5 bg-white rounded-lg border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            {editingKey ? `Edit Filter: ${editingKey}` : 'Add New Filter'}
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Key <span className="text-red-400">*</span>
                </label>
                <input
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  disabled={!!editingKey}
                  placeholder="e.g. department"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-400 mt-1">Must match the filter name in query definitions</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Label <span className="text-red-400">*</span>
                </label>
                <input
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g. Department"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as 'select' | 'text' | 'boolean')}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="select">Dropdown (pre-populated values)</option>
                  <option value="text">Text Input (free-form)</option>
                  <option value="boolean">True / False (toggle)</option>
                </select>
              </div>
            </div>

            {formType === 'text' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
                <input
                  value={formPlaceholder}
                  onChange={(e) => setFormPlaceholder(e.target.value)}
                  placeholder="e.g. Enter department name..."
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {formType === 'select' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Dropdown Options <span className="text-red-400">*</span>
                  </label>
                  <button
                    onClick={addOption}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + Add Option
                  </button>
                </div>
                <div className="space-y-2">
                  {formOptions.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        value={opt.value}
                        onChange={(e) => updateOption(idx, 'value', e.target.value)}
                        placeholder="Value (sent to API)"
                        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        value={opt.label}
                        onChange={(e) => updateOption(idx, 'label', e.target.value)}
                        placeholder="Display label"
                        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {formOptions.length > 1 && (
                        <button
                          onClick={() => removeOption(idx)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : editingKey ? 'Update Filter' : 'Add Filter'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Key</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Label</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Values / Placeholder</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filterEntries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">
                  No filter options configured. Any filter key without a config will render as a text input.
                </td>
              </tr>
            ) : (
              filterEntries.map(([key, entry]) => (
                <tr key={key} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-gray-900">{key}</td>
                  <td className="px-4 py-3 text-gray-600">{entry.label}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded ${
                        entry.type === 'select'
                          ? 'bg-blue-100 text-blue-700'
                          : entry.type === 'boolean'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {entry.type === 'select' ? 'Dropdown' : entry.type === 'boolean' ? 'True / False' : 'Text Input'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {entry.type === 'select'
                      ? entry.options.map((o) => o.label).join(', ')
                      : entry.type === 'boolean'
                      ? 'True, False'
                      : entry.placeholder || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(key, entry)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      {deletingKey === key ? (
                        <span className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(key)}
                            className="text-xs text-red-600 font-medium hover:underline"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingKey(null)}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setDeletingKey(key)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Any filter key used in a query that is not listed here will automatically render as a text input.
        To make it a dropdown, add it here with pre-populated values.
      </p>
    </div>
  );
}
