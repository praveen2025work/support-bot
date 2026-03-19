"use client";

import { useState, useEffect } from "react";
import { csrfHeaders } from "@/lib/csrf";
import { RefreshCw } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSource {
  url: string;
  valuePath?: string;
  valueField?: string;
  labelField?: string;
  lastRefreshed?: string | null;
}

type FilterTypeValue =
  | "select"
  | "text"
  | "boolean"
  | "multi_select"
  | "date"
  | "date_range"
  | "number_range"
  | "search";

interface FilterEntry {
  label: string;
  type: FilterTypeValue;
  options: FilterOption[];
  placeholder: string | null;
  source?: FilterSource;
  presets?: { value: string; label: string }[];
  numberConfig?: { min?: number; max?: number; step?: number };
  debounceMs?: number;
  dateFormat?: string;
}

export default function FiltersPage() {
  const [filters, setFilters] = useState<Record<string, FilterEntry>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  // Form fields
  const [formKey, setFormKey] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formType, setFormType] = useState<FilterTypeValue>("select");
  const [formPlaceholder, setFormPlaceholder] = useState("");
  const [formOptions, setFormOptions] = useState<FilterOption[]>([
    { value: "", label: "" },
  ]);

  // Source config form fields
  const [formSourceEnabled, setFormSourceEnabled] = useState(false);
  const [formSourceUrl, setFormSourceUrl] = useState("");
  const [formSourceValuePath, setFormSourceValuePath] = useState("");
  const [formSourceValueField, setFormSourceValueField] = useState("");
  const [formSourceLabelField, setFormSourceLabelField] = useState("");

  // Type-specific form fields
  const [formDateFormat, setFormDateFormat] = useState("YYYY-MM-DD");
  const [formPresets, setFormPresets] = useState<FilterOption[]>([]);
  const [formNumberMin, setFormNumberMin] = useState("");
  const [formNumberMax, setFormNumberMax] = useState("");
  const [formNumberStep, setFormNumberStep] = useState("");
  const [formDebounceMs, setFormDebounceMs] = useState("300");

  const fetchFilters = async () => {
    try {
      const res = await fetch("/api/admin/filters");
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
    setFormKey("");
    setFormLabel("");
    setFormType("select");
    setFormPlaceholder("");
    setFormOptions([{ value: "", label: "" }]);
    setFormSourceEnabled(false);
    setFormSourceUrl("");
    setFormSourceValuePath("");
    setFormSourceValueField("");
    setFormSourceLabelField("");
    setFormDateFormat("YYYY-MM-DD");
    setFormPresets([]);
    setFormNumberMin("");
    setFormNumberMax("");
    setFormNumberStep("");
    setFormDebounceMs("300");
    setEditingKey(null);
    setShowForm(false);
    setError("");
  };

  const startEdit = (key: string, entry: FilterEntry) => {
    setFormKey(key);
    setFormLabel(entry.label);
    setFormType(entry.type);
    setFormPlaceholder(entry.placeholder || "");
    setFormOptions(
      entry.options.length > 0 ? entry.options : [{ value: "", label: "" }],
    );
    // Populate source fields
    if (entry.source) {
      setFormSourceEnabled(true);
      setFormSourceUrl(entry.source.url || "");
      setFormSourceValuePath(entry.source.valuePath || "");
      setFormSourceValueField(entry.source.valueField || "");
      setFormSourceLabelField(entry.source.labelField || "");
    } else {
      setFormSourceEnabled(false);
      setFormSourceUrl("");
      setFormSourceValuePath("");
      setFormSourceValueField("");
      setFormSourceLabelField("");
    }
    // Populate type-specific fields
    setFormDateFormat(entry.dateFormat || "YYYY-MM-DD");
    setFormPresets(entry.presets || []);
    setFormNumberMin(entry.numberConfig?.min?.toString() || "");
    setFormNumberMax(entry.numberConfig?.max?.toString() || "");
    setFormNumberStep(entry.numberConfig?.step?.toString() || "");
    setFormDebounceMs(entry.debounceMs?.toString() || "300");
    setEditingKey(key);
    setShowForm(true);
    setError("");
  };

  const addOption = () => {
    setFormOptions([...formOptions, { value: "", label: "" }]);
  };

  const removeOption = (idx: number) => {
    setFormOptions(formOptions.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, field: "value" | "label", val: string) => {
    const updated = [...formOptions];
    updated[idx] = { ...updated[idx], [field]: val };
    setFormOptions(updated);
  };

  const buildSource = (): FilterSource | undefined => {
    const typesWithSource: FilterTypeValue[] = [
      "select",
      "multi_select",
      "search",
    ];
    if (!formSourceEnabled || !typesWithSource.includes(formType))
      return undefined;
    if (!formSourceUrl.trim()) return undefined;
    return {
      url: formSourceUrl.trim(),
      ...(formSourceValuePath.trim()
        ? { valuePath: formSourceValuePath.trim() }
        : {}),
      ...(formSourceValueField.trim()
        ? { valueField: formSourceValueField.trim() }
        : {}),
      ...(formSourceLabelField.trim()
        ? { labelField: formSourceLabelField.trim() }
        : {}),
    };
  };

  const handleSave = async () => {
    if (!formKey.trim() || !formLabel.trim()) {
      setError("Key and label are required.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(formKey.trim())) {
      setError("Key must be lowercase alphanumeric with underscores only.");
      return;
    }
    const source = buildSource();
    const needsOptions = formType === "select" || formType === "multi_select";
    if (needsOptions && !source) {
      const validOptions = formOptions.filter(
        (o) => o.value.trim() && o.label.trim(),
      );
      if (validOptions.length === 0) {
        setError(
          "This filter type requires at least one option (or configure a dynamic source).",
        );
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      const validOptions = formOptions.filter(
        (o) => o.value.trim() && o.label.trim(),
      );
      const validPresets = formPresets.filter(
        (p) => p.value.trim() && p.label.trim(),
      );

      // Build type-specific extra fields
      const extras: Record<string, unknown> = {};
      if (formType === "date" || formType === "date_range") {
        extras.dateFormat = formDateFormat || "YYYY-MM-DD";
      }
      if (formType === "date_range" && validPresets.length > 0) {
        extras.presets = validPresets;
      }
      if (formType === "number_range") {
        const nc: Record<string, number> = {};
        if (formNumberMin) nc.min = Number(formNumberMin);
        if (formNumberMax) nc.max = Number(formNumberMax);
        if (formNumberStep) nc.step = Number(formNumberStep);
        if (Object.keys(nc).length > 0) extras.numberConfig = nc;
      }
      if (formType === "search" && formDebounceMs) {
        extras.debounceMs = Number(formDebounceMs);
      }

      const res = await fetch("/api/admin/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          key: formKey.trim(),
          label: formLabel.trim(),
          type: formType,
          options:
            formType === "select" || formType === "multi_select"
              ? validOptions
              : [],
          placeholder:
            formType === "text" || formType === "search"
              ? formPlaceholder.trim() || null
              : null,
          ...(source ? { source } : {}),
          ...extras,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save filter");
        return;
      }

      resetForm();
      fetchFilters();
    } catch {
      setError("Failed to save filter");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      const res = await fetch(
        `/api/admin/filters?key=${encodeURIComponent(key)}`,
        {
          method: "DELETE",
          headers: { ...csrfHeaders() },
        },
      );
      if (res.ok) {
        fetchFilters();
      }
      setDeletingKey(null);
    } catch {
      // ignore
    }
  };

  const handleRefresh = async (key?: string) => {
    const refreshId = key || "__all__";
    setRefreshing(refreshId);
    setError("");
    try {
      const res = await fetch("/api/admin/filters/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(key ? { key } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Refresh failed");
        return;
      }
      if (data.errors && Object.keys(data.errors).length > 0) {
        const msgs = Object.entries(data.errors)
          .map(([k, v]) => `${k}: ${v}`)
          .join("; ");
        setError(`Some refreshes failed: ${msgs}`);
      }
      fetchFilters();
    } catch {
      setError("Refresh failed — engine unreachable");
    } finally {
      setRefreshing(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading filter options...</p>;
  }

  const filterEntries = Object.entries(filters);
  const hasDynamicFilters = filterEntries.some(([, e]) => !!e.source);

  const sourceLabel = (entry: FilterEntry) => {
    if (!entry.source) return "Static";
    try {
      return `API: ${new URL(entry.source.url).hostname}`;
    } catch {
      return `API: ${entry.source.url}`;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Filter Options
          </h1>
          <p className="text-sm text-gray-500">
            Configure which filters show as dropdowns, text inputs, or
            true/false toggles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasDynamicFilters && (
            <button
              onClick={() => handleRefresh()}
              disabled={refreshing === "__all__"}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              title="Refresh all dynamic filter sources"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing === "__all__" ? "animate-spin" : ""}`}
              />
              {refreshing === "__all__" ? "Refreshing..." : "Refresh All"}
            </button>
          )}
          {!showForm && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
            >
              + Add Filter
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 p-5 bg-white rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            {editingKey ? `Edit Filter: ${editingKey}` : "Add New Filter"}
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
                <p className="text-xs text-gray-400 mt-1">
                  Must match the filter name in query definitions
                </p>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Type
                </label>
                <select
                  value={formType}
                  onChange={(e) =>
                    setFormType(e.target.value as FilterEntry["type"])
                  }
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="select">Dropdown (single select)</option>
                  <option value="multi_select">
                    Multi-Select (checkboxes)
                  </option>
                  <option value="text">Text Input (free-form)</option>
                  <option value="boolean">True / False (toggle)</option>
                  <option value="date">Date Picker</option>
                  <option value="date_range">Date Range (from/to)</option>
                  <option value="number_range">Number Range (min/max)</option>
                  <option value="search">Search (typeahead)</option>
                </select>
              </div>
            </div>

            {(formType === "text" || formType === "search") && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Placeholder
                </label>
                <input
                  value={formPlaceholder}
                  onChange={(e) => setFormPlaceholder(e.target.value)}
                  placeholder={
                    formType === "search"
                      ? "e.g. Search by name..."
                      : "e.g. Enter department name..."
                  }
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {formType === "search" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Debounce (ms)
                  </label>
                  <input
                    type="number"
                    value={formDebounceMs}
                    onChange={(e) => setFormDebounceMs(e.target.value)}
                    placeholder="300"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">
                    Delay before fetching suggestions
                  </p>
                </div>
              </div>
            )}

            {(formType === "date" || formType === "date_range") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date Format
                  </label>
                  <select
                    value={formDateFormat}
                    onChange={(e) => setFormDateFormat(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  </select>
                </div>
              </div>
            )}

            {formType === "date_range" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Quick Presets{" "}
                    <span className="text-gray-400">(optional)</span>
                  </label>
                  <button
                    onClick={() =>
                      setFormPresets([...formPresets, { value: "", label: "" }])
                    }
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + Add Preset
                  </button>
                </div>
                {formPresets.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    No presets. Users will pick dates manually.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formPresets.map((p, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          value={p.value}
                          onChange={(e) => {
                            const updated = [...formPresets];
                            const val = e.target.value;
                            updated[idx] = {
                              value: val,
                              label: val
                                ? val
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (c) => c.toUpperCase())
                                : "",
                            };
                            setFormPresets(updated);
                          }}
                          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select preset...</option>
                          <option value="today">Today</option>
                          <option value="this_week">This Week</option>
                          <option value="this_month">This Month</option>
                          <option value="last_week">Last Week</option>
                          <option value="last_month">Last Month</option>
                          <option value="last_quarter">Last Quarter</option>
                        </select>
                        <input
                          value={p.label}
                          onChange={(e) => {
                            const updated = [...formPresets];
                            updated[idx] = {
                              ...updated[idx],
                              label: e.target.value,
                            };
                            setFormPresets(updated);
                          }}
                          placeholder="Display label"
                          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() =>
                            setFormPresets(
                              formPresets.filter((_, i) => i !== idx),
                            )
                          }
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {formType === "number_range" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Number Range Config
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">
                      Min
                    </label>
                    <input
                      type="number"
                      value={formNumberMin}
                      onChange={(e) => setFormNumberMin(e.target.value)}
                      placeholder="0"
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">
                      Max
                    </label>
                    <input
                      type="number"
                      value={formNumberMax}
                      onChange={(e) => setFormNumberMax(e.target.value)}
                      placeholder="100"
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">
                      Step
                    </label>
                    <input
                      type="number"
                      value={formNumberStep}
                      onChange={(e) => setFormNumberStep(e.target.value)}
                      placeholder="1"
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {(formType === "select" ||
              formType === "multi_select" ||
              formType === "search") && (
              <>
                {/* Static options (not for search) */}
                {(formType === "select" || formType === "multi_select") && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-gray-600">
                        Dropdown Options{" "}
                        {!formSourceEnabled && (
                          <span className="text-red-400">*</span>
                        )}
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
                            onChange={(e) =>
                              updateOption(idx, "value", e.target.value)
                            }
                            placeholder="Value (sent to API)"
                            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            value={opt.label}
                            onChange={(e) =>
                              updateOption(idx, "label", e.target.value)
                            }
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
                    {formSourceEnabled && (
                      <p className="text-xs text-gray-400 mt-1 italic">
                        Static options serve as defaults until the source is
                        refreshed.
                      </p>
                    )}
                  </div>
                )}

                {/* Dynamic API source section */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formSourceEnabled}
                      onChange={(e) => setFormSourceEnabled(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-gray-700">
                      Fetch options dynamically from an API
                    </span>
                  </label>

                  {formSourceEnabled && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          API URL <span className="text-red-400">*</span>
                        </label>
                        <input
                          value={formSourceUrl}
                          onChange={(e) => setFormSourceUrl(e.target.value)}
                          placeholder="https://api.example.com/filters/departments"
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">
                          Must return JSON: an array of objects or strings
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Value Path
                          </label>
                          <input
                            value={formSourceValuePath}
                            onChange={(e) =>
                              setFormSourceValuePath(e.target.value)
                            }
                            placeholder="e.g. data.items"
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-400 mt-0.5">
                            Dot-path to the array
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Value Field
                          </label>
                          <input
                            value={formSourceValueField}
                            onChange={(e) =>
                              setFormSourceValueField(e.target.value)
                            }
                            placeholder='Default: "value"'
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Label Field
                          </label>
                          <input
                            value={formSourceLabelField}
                            onChange={(e) =>
                              setFormSourceLabelField(e.target.value)
                            }
                            placeholder='Default: "label"'
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Standard response contract hint */}
                      <div className="bg-white border border-gray-200 rounded p-3">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Standard API Response Contract
                        </p>
                        <div className="text-[11px] text-gray-500 font-mono space-y-1">
                          <p>
                            {
                              '[{ "value": "US", "label": "United States" }, ...]'
                            }
                          </p>
                          <p className="text-gray-400">
                            or plain strings: {' ["US", "EU", "APAC"]'}
                          </p>
                          <p className="text-gray-400">
                            or nested: {'{ "data": { "items": [...] } }'} → set
                            Value Path
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving
                ? "Saving..."
                : editingKey
                  ? "Update Filter"
                  : "Add Filter"}
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Key
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Label
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Values / Placeholder
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filterEntries.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-gray-400 text-sm"
                >
                  No filter options configured. Any filter key without a config
                  will render as a text input.
                </td>
              </tr>
            ) : (
              filterEntries.map(([key, entry]) => (
                <tr
                  key={key}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-gray-900">{key}</td>
                  <td className="px-4 py-3 text-gray-600">{entry.label}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded ${
                        entry.type === "select" || entry.type === "multi_select"
                          ? "bg-blue-100 text-blue-700"
                          : entry.type === "boolean"
                            ? "bg-green-100 text-green-700"
                            : entry.type === "date" ||
                                entry.type === "date_range"
                              ? "bg-amber-100 text-amber-700"
                              : entry.type === "number_range"
                                ? "bg-purple-100 text-purple-700"
                                : entry.type === "search"
                                  ? "bg-teal-100 text-teal-700"
                                  : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {{
                        select: "Dropdown",
                        multi_select: "Multi-Select",
                        boolean: "True / False",
                        text: "Text Input",
                        date: "Date Picker",
                        date_range: "Date Range",
                        number_range: "Number Range",
                        search: "Search",
                      }[entry.type] || entry.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-xs ${entry.source ? "text-purple-700 font-medium" : "text-gray-400"}`}
                      >
                        {sourceLabel(entry)}
                      </span>
                      {entry.source?.lastRefreshed && (
                        <span className="text-[10px] text-gray-400">
                          {new Date(
                            entry.source.lastRefreshed,
                          ).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                    {entry.type === "select" || entry.type === "multi_select"
                      ? `${entry.options.length} option${entry.options.length !== 1 ? "s" : ""}`
                      : entry.type === "boolean"
                        ? "True, False"
                        : entry.type === "date_range"
                          ? `${entry.presets?.length || 0} presets`
                          : entry.type === "number_range"
                            ? `${entry.numberConfig?.min ?? "-∞"} — ${entry.numberConfig?.max ?? "∞"} (step ${entry.numberConfig?.step ?? 1})`
                            : entry.type === "date"
                              ? entry.dateFormat || "YYYY-MM-DD"
                              : entry.placeholder || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {entry.source && (
                        <button
                          onClick={() => handleRefresh(key)}
                          disabled={!!refreshing}
                          className="p-1 text-purple-500 hover:text-purple-700 disabled:opacity-50 rounded"
                          title="Refresh options from source"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${refreshing === key ? "animate-spin" : ""}`}
                          />
                        </button>
                      )}
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
        Any filter key used in a query that is not listed here will
        automatically render as a text input. To make it a dropdown, add it here
        with pre-populated values or configure a dynamic API source.
      </p>
    </div>
  );
}
