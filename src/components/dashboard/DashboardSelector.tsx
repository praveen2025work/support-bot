"use client";

import { useState, useRef, useEffect } from "react";
import type { Dashboard } from "@/types/dashboard";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Menu, ChevronDown, Pencil, Trash2, Plus } from "lucide-react";

interface DashboardSelectorProps {
  dashboards: Dashboard[];
  activeDashboardId?: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function DashboardSelector({
  dashboards,
  activeDashboardId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}: DashboardSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsCreating(false);
        setEditingId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId);

  const handleCreate = () => {
    if (newName.trim()) {
      onCreate(newName.trim());
      setNewName("");
      setIsCreating(false);
      setIsOpen(false);
    }
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      onRename(id, editName.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <Menu size={16} />
        {activeDashboard?.name || "Select Dashboard"}
        <ChevronDown
          size={12}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {dashboards.length > 0 && (
            <div className="max-h-60 overflow-y-auto py-1 scrollbar-hide">
              {dashboards.map((d) => (
                <div
                  key={d.id}
                  className={`flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer ${d.id === activeDashboardId ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                >
                  {editingId === d.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(d.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => handleRename(d.id)}
                      className="flex-1 text-sm px-1 py-0.5 border border-blue-300 rounded mr-2"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => {
                        onSelect(d.id);
                        setIsOpen(false);
                      }}
                      className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate"
                    >
                      {d.name}
                      <span className="text-xs text-gray-400 ml-2">
                        ({d.cards.length} cards)
                      </span>
                    </span>
                  )}
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(d.id);
                        setEditName(d.name);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 rounded"
                      title="Rename"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: d.id, name: d.name });
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 p-2">
            {isCreating ? (
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setIsCreating(false);
                  }}
                  placeholder="Dashboard name..."
                  className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded"
                  autoFocus
                />
                <button
                  onClick={handleCreate}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded flex items-center gap-2"
              >
                <Plus size={16} />
                New Dashboard
              </button>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Dashboard"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
