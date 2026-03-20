"use client";

import { useState, useEffect } from "react";
import { X, LayoutTemplate } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

export function TemplateGallery({
  isOpen,
  onClose,
  onSelect,
}: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern
    setLoading(true);
    fetch("/api/dashboards/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = Array.from(new Set(templates.map((t) => t.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Dashboard Templates
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No templates available
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat} className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {cat}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {templates
                    .filter((t) => t.category === cat)
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSelect(t.id);
                          onClose();
                        }}
                        className="text-left p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                      >
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {t.description}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
