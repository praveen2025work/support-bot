"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Dashboard } from "@/types/dashboard";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  Menu,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  Download,
  Upload,
  Share2,
  Users,
  Globe,
  Lock,
  Search,
  X,
} from "lucide-react";

interface DashboardSelectorProps {
  dashboards: Dashboard[];
  activeDashboardId?: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onExport?: (id: string) => void;
  onImport?: (data: Dashboard) => void;
  onShare?: (id: string) => void;
  sharedDashboards?: Array<{ dashboard: Dashboard; ownerId: string }>;
}

export function DashboardSelector({
  dashboards,
  activeDashboardId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onExport,
  onImport,
  onShare,
  sharedDashboards,
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
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsCreating(false);
        setEditingId(null);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId);

  // Split sharedDashboards into "shared with me" vs "public"
  const { sharedWithMe, publicDashboards } = useMemo(() => {
    const shared: Array<{ dashboard: Dashboard; ownerId: string }> = [];
    const pub: Array<{ dashboard: Dashboard; ownerId: string }> = [];
    for (const entry of sharedDashboards || []) {
      if (entry.dashboard.sharing?.isPublic) {
        pub.push(entry);
      } else {
        shared.push(entry);
      }
    }
    return { sharedWithMe: shared, publicDashboards: pub };
  }, [sharedDashboards]);

  // Filter all sections by search
  const query = search.toLowerCase().trim();
  const filteredOwn = query
    ? dashboards.filter((d) => d.name.toLowerCase().includes(query))
    : dashboards;
  const filteredShared = query
    ? sharedWithMe.filter(
        (e) =>
          e.dashboard.name.toLowerCase().includes(query) ||
          e.ownerId.toLowerCase().includes(query),
      )
    : sharedWithMe;
  const filteredPublic = query
    ? publicDashboards.filter(
        (e) =>
          e.dashboard.name.toLowerCase().includes(query) ||
          e.ownerId.toLowerCase().includes(query),
      )
    : publicDashboards;

  const toggleSection = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

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

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        onImport(data);
        setIsOpen(false);
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const visibilityBadge = (d: Dashboard) => {
    if (d.sharing?.isPublic) {
      return (
        <span className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <Globe size={8} /> Public
        </span>
      );
    }
    if (d.sharing?.sharedWith && d.sharing.sharedWith.length > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <Users size={8} /> Shared
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        <Lock size={8} /> Private
      </span>
    );
  };

  const renderOwnDashboard = (d: Dashboard) => (
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
          className="flex-1 text-sm px-1 py-0.5 border border-blue-300 rounded mr-2 bg-white dark:bg-gray-700 dark:text-gray-200"
          autoFocus
        />
      ) : (
        <span
          onClick={() => {
            onSelect(d.id);
            setIsOpen(false);
            setSearch("");
          }}
          className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate"
        >
          {d.name}
          {d.simpleMode && (
            <span className="inline-flex items-center ml-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Simple
            </span>
          )}
          {visibilityBadge(d)}
          <span className="text-xs text-gray-400 ml-2">
            ({d.cards.length} cards)
          </span>
        </span>
      )}
      <div className="flex items-center gap-1 ml-2 shrink-0">
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
        {onExport && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport(d.id);
            }}
            className="p-1 text-gray-400 hover:text-green-500 rounded"
            title="Export"
          >
            <Download size={14} />
          </button>
        )}
        {onShare && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(d.id);
              setIsOpen(false);
            }}
            className="p-1 text-gray-400 hover:text-purple-500 rounded"
            title="Share"
          >
            <Share2 size={14} />
          </button>
        )}
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
  );

  const renderExternalDashboard = (
    entry: { dashboard: Dashboard; ownerId: string },
    badgeColor: string,
    badgeLabel: string,
  ) => (
    <div
      key={`${entry.ownerId}-${entry.dashboard.id}`}
      className={`flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer ${entry.dashboard.id === activeDashboardId ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
      onClick={() => {
        onSelect(entry.dashboard.id);
        setIsOpen(false);
        setSearch("");
      }}
    >
      <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">
        {entry.dashboard.name}
        <span className="text-[10px] text-gray-400 ml-1.5">
          by {entry.ownerId}
        </span>
        <span className="text-xs text-gray-400 ml-2">
          ({entry.dashboard.cards.length} cards)
        </span>
      </span>
      <span
        className={`text-[10px] ${badgeColor} px-1.5 py-0.5 rounded-full shrink-0`}
      >
        {badgeLabel}
      </span>
    </div>
  );

  const renderSectionHeader = (
    icon: React.ReactNode,
    label: string,
    count: number,
    sectionKey: string,
  ) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
    >
      <ChevronRight
        size={10}
        className={`transition-transform ${!collapsed[sectionKey] ? "rotate-90" : ""}`}
      />
      {icon}
      {label}
      <span className="text-gray-300 dark:text-gray-600 ml-auto font-normal normal-case">
        {count}
      </span>
    </button>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <Menu size={16} />
        {activeDashboard?.name || "Select Dashboard"}
        {activeDashboard?.sharing?.isPublic && (
          <Globe size={10} className="text-emerald-500" />
        )}
        {activeDashboard &&
          !activeDashboard.sharing?.isPublic &&
          (activeDashboard.sharing?.sharedWith?.length ?? 0) > 0 && (
            <Users size={10} className="text-purple-500" />
          )}
        <ChevronDown
          size={12}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dashboards..."
                className="w-full text-sm pl-8 pr-7 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto scrollbar-hide divide-y divide-gray-100 dark:divide-gray-700/50">
            {/* My Dashboards */}
            {filteredOwn.length > 0 && (
              <div>
                {renderSectionHeader(
                  <Lock size={10} />,
                  "My Dashboards",
                  filteredOwn.length,
                  "my",
                )}
                {!collapsed["my"] && (
                  <div>{filteredOwn.map(renderOwnDashboard)}</div>
                )}
              </div>
            )}

            {/* Shared with Me */}
            {filteredShared.length > 0 && (
              <div>
                {renderSectionHeader(
                  <Users size={10} />,
                  "Shared with Me",
                  filteredShared.length,
                  "shared",
                )}
                {!collapsed["shared"] && (
                  <div>
                    {filteredShared.map((entry) =>
                      renderExternalDashboard(
                        entry,
                        "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
                        "shared",
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Public Dashboards */}
            {filteredPublic.length > 0 && (
              <div>
                {renderSectionHeader(
                  <Globe size={10} />,
                  "Public Dashboards",
                  filteredPublic.length,
                  "public",
                )}
                {!collapsed["public"] && (
                  <div>
                    {filteredPublic.map((entry) =>
                      renderExternalDashboard(
                        entry,
                        "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                        "public",
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

            {/* No results */}
            {filteredOwn.length === 0 &&
              filteredShared.length === 0 &&
              filteredPublic.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-gray-400">
                  {query
                    ? `No dashboards matching "${search}"`
                    : "No dashboards yet"}
                </div>
              )}
          </div>

          {/* Actions footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-2 space-y-1">
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
                  className="flex-1 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-gray-200"
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
              <>
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full text-left px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded flex items-center gap-2"
                >
                  <Plus size={16} />
                  New Dashboard
                </button>
                {onImport && (
                  <button
                    onClick={() => importInputRef.current?.click()}
                    className="w-full text-left px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded flex items-center gap-2"
                  >
                    <Upload size={16} />
                    Import Dashboard
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input for import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />

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
