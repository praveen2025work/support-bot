"use client";

import { useState, useRef, useEffect } from "react";
import type { DashboardTab } from "@/types/dashboard";
import { Plus, X, Pencil } from "lucide-react";

interface DashboardTabBarProps {
  tabs: DashboardTab[];
  activeTabId?: string;
  onSelectTab: (tabId: string) => void;
  onAddTab: (name: string) => void;
  onRenameTab: (tabId: string, name: string) => void;
  onRemoveTab: (tabId: string) => void;
  readOnly?: boolean;
}

export function DashboardTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onRenameTab,
  onRemoveTab,
  readOnly,
}: DashboardTabBarProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) inputRef.current.focus();
  }, [isAdding]);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (trimmed) {
      onAddTab(trimmed);
      setNewName("");
      setIsAdding(false);
    }
  };

  const handleRename = (tabId: string) => {
    const trimmed = editName.trim();
    if (trimmed) {
      onRenameTab(tabId, trimmed);
    }
    setEditingId(null);
  };

  if (tabs.length === 0 && readOnly) return null;

  return (
    <div className="flex items-center gap-1 px-1 mb-3 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`group flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 cursor-pointer transition-colors ${
            tab.id === activeTabId
              ? "bg-white dark:bg-gray-800 text-blue-600 border-gray-200 dark:border-gray-700"
              : "bg-gray-50 dark:bg-gray-850 text-gray-500 border-transparent hover:bg-gray-100 dark:hover:bg-gray-750"
          }`}
          onClick={() => onSelectTab(tab.id)}
        >
          {editingId === tab.id ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => handleRename(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename(tab.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="text-xs px-1 py-0.5 border border-blue-300 rounded w-20 focus:outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate max-w-[100px]">{tab.name}</span>
          )}
          {!readOnly && tab.id === activeTabId && editingId !== tab.id && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(tab.id);
                  setEditName(tab.name);
                }}
                className="p-0.5 text-gray-400 hover:text-blue-500 rounded"
                title="Rename tab"
              >
                <Pencil size={10} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTab(tab.id);
                }}
                className="p-0.5 text-gray-400 hover:text-red-500 rounded"
                title="Remove tab"
              >
                <X size={10} />
              </button>
            </div>
          )}
        </div>
      ))}
      {!readOnly && (
        <>
          {isAdding ? (
            <div className="flex items-center gap-1 px-1">
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") {
                    setIsAdding(false);
                    setNewName("");
                  }
                }}
                onBlur={() => {
                  if (!newName.trim()) setIsAdding(false);
                  else handleAdd();
                }}
                placeholder="Tab name..."
                className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-blue-500 transition-colors"
              title="Add tab"
            >
              <Plus size={12} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
