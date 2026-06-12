"use client";

import { useEffect, useState } from "react";

export interface OnboardTemplateQuery {
  name: string;
  description: string;
  source: string;
  url: string;
  filters: string;
}

export interface OnboardTemplate {
  id: string;
  label: string;
  description: string;
  source: string;
  queries: OnboardTemplateQuery[];
}

/**
 * Browse prebuilt query templates (derived from the per-source corpus files)
 * and seed the manual onboard form from one. "Start blank" clears the seed.
 */
export function TemplatePicker({
  onSelect,
}: {
  onSelect: (template: OnboardTemplate | null) => void;
}) {
  const [templates, setTemplates] = useState<OnboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string | "blank" | null>(null);

  useEffect(() => {
    fetch("/api/admin/onboard/templates")
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-500 mb-6">Loading templates…</p>;
  }
  if (templates.length === 0) return null;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">
        Start from a template{" "}
        <span className="text-gray-400 font-normal">(optional)</span>
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Pick a prebuilt query set to pre-fill the form, then edit before
        creating.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setPicked(t.id);
              onSelect(t);
            }}
            className={`text-left p-3 rounded-lg border transition-colors ${
              picked === t.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-blue-300"
            }`}
          >
            <div className="text-sm font-medium text-gray-900">{t.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setPicked("blank");
            onSelect(null);
          }}
          className={`text-left p-3 rounded-lg border border-dashed transition-colors ${
            picked === "blank"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-300"
          }`}
        >
          <div className="text-sm font-medium text-gray-900">Start blank</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Define queries from scratch
          </div>
        </button>
      </div>
    </section>
  );
}
