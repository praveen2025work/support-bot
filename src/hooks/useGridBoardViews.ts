"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { GridBoardView } from "@/types/dashboard";

interface UseGridBoardViewsReturn {
  views: GridBoardView[];
  activeView: GridBoardView | null;
  loading: boolean;
  error: string | null;
  fetchViews: () => Promise<void>;
  loadView: (viewId: string) => void;
  saveView: (partial: Partial<GridBoardView>) => Promise<GridBoardView | null>;
  saveViewAs: (
    viewName: string,
    config: Partial<GridBoardView>,
    visibility?: "private" | "public",
  ) => Promise<GridBoardView | null>;
  deleteView: (viewId: string) => Promise<boolean>;
  clearActiveView: () => void;
  /** Debounced auto-save for config changes */
  autoSave: (partial: Partial<GridBoardView>) => void;
}

export function useGridBoardViews(
  userId: string | undefined,
  queryName: string,
  groupId: string = "default",
): UseGridBoardViewsReturn {
  const [views, setViews] = useState<GridBoardView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const activeView = views.find((v) => v.id === activeViewId) || null;

  const fetchViews = useCallback(async () => {
    if (!userId || !queryName) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/gridboard-views?userId=${encodeURIComponent(userId)}&queryName=${encodeURIComponent(queryName)}&groupId=${encodeURIComponent(groupId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch views");
      const json = await res.json();
      setViews(json.views || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch views");
    } finally {
      setLoading(false);
    }
  }, [userId, queryName, groupId]);

  // Auto-fetch on mount / queryName change
  useEffect(() => {
    if (userId && queryName) {
      fetchViews();
    } else {
      setViews([]);
      setActiveViewId(null);
    }
  }, [userId, queryName, fetchViews]);

  const loadView = useCallback((viewId: string) => {
    setActiveViewId(viewId);
  }, []);

  const clearActiveView = useCallback(() => {
    setActiveViewId(null);
  }, []);

  const saveView = useCallback(
    async (partial: Partial<GridBoardView>): Promise<GridBoardView | null> => {
      if (!userId || !activeViewId) return null;
      // Optimistic concurrency — send If-Match with the version we
      // last saw. Engine returns 409 with the current view if it
      // moved under us; we refresh state from that response so a
      // retry succeeds without forcing the user to reload.
      const current = views.find((v) => v.id === activeViewId);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (current?.version !== undefined) {
        headers["If-Match"] = String(current.version);
      }
      try {
        const res = await fetch(`/api/gridboard-views/${activeViewId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ userId, groupId, ...partial }),
        });
        if (res.status === 409) {
          const body = await res.json().catch(() => ({}));
          if (body?.view) {
            // Replace our stale copy with the server's. The auto-save
            // can re-fire and will pick up the new version on the next
            // tick.
            setViews((prev) =>
              prev.map((v) => (v.id === activeViewId ? body.view : v)),
            );
          }
          setError("View was updated elsewhere — refreshed to latest");
          return null;
        }
        if (!res.ok) throw new Error("Failed to save view");
        const updated = await res.json();
        setViews((prev) =>
          prev.map((v) => (v.id === activeViewId ? updated : v)),
        );
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save view");
        return null;
      }
    },
    [userId, activeViewId, views, groupId],
  );

  const saveViewAs = useCallback(
    async (
      viewName: string,
      config: Partial<GridBoardView>,
      visibility: "private" | "public" = "private",
    ): Promise<GridBoardView | null> => {
      if (!userId || !queryName) return null;
      try {
        const res = await fetch("/api/gridboard-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            groupId,
            queryName,
            viewName,
            visibility,
            columnOrder: config.columnOrder || [],
            hiddenColumns: config.hiddenColumns || [],
            columnWidths: config.columnWidths || {},
            pinnedColumns: config.pinnedColumns || [],
            sortConfig: config.sortConfig || [],
            groupByColumn: config.groupByColumn,
            clientFilters: config.clientFilters || {},
            pageSize: config.pageSize || 25,
            conditionalFormats: config.conditionalFormats || [],
          }),
        });
        if (!res.ok) throw new Error("Failed to create view");
        const created = await res.json();
        setViews((prev) => [...prev, created]);
        setActiveViewId(created.id);
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create view");
        return null;
      }
    },
    [userId, queryName, groupId],
  );

  const deleteView = useCallback(
    async (viewId: string): Promise<boolean> => {
      if (!userId) return false;
      try {
        const res = await fetch(
          `/api/gridboard-views/${viewId}?userId=${encodeURIComponent(userId)}&groupId=${encodeURIComponent(groupId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Failed to delete view");
        setViews((prev) => prev.filter((v) => v.id !== viewId));
        if (activeViewId === viewId) setActiveViewId(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete view");
        return false;
      }
    },
    [userId, activeViewId, groupId],
  );

  // Debounced auto-save (500ms)
  const autoSave = useCallback(
    (partial: Partial<GridBoardView>) => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        saveView(partial);
      }, 500);
    },
    [saveView],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  return {
    views,
    activeView,
    loading,
    error,
    fetchViews,
    loadView,
    saveView,
    saveViewAs,
    deleteView,
    clearActiveView,
    autoSave,
  };
}
