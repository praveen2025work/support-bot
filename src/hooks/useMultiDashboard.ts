"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  Dashboard,
  DashboardCard,
  DashboardTab,
  CardLayout,
  DashboardSharing,
} from "@/types/dashboard";

interface UseMultiDashboardReturn {
  dashboards: Dashboard[];
  activeDashboard: Dashboard | null;
  /** Permission level for the active dashboard: 'owner' for own, 'view'/'edit' for shared */
  activePermission: "owner" | "edit" | "view";
  loading: boolean;
  error: string | null;
  fetchDashboards: () => Promise<void>;
  createDashboard: (name: string) => Promise<Dashboard | null>;
  deleteDashboard: (id: string) => Promise<boolean>;
  setActiveDashboard: (id: string) => Promise<void>;
  addCard: (
    dashboardId: string,
    card: Omit<DashboardCard, "id" | "createdAt">,
  ) => Promise<DashboardCard | null>;
  removeCard: (dashboardId: string, cardId: string) => Promise<boolean>;
  updateCard: (
    dashboardId: string,
    cardId: string,
    partial: Partial<DashboardCard>,
  ) => Promise<DashboardCard | null>;
  updateLayouts: (dashboardId: string, layouts: CardLayout[]) => void; // debounced
  renameDashboard: (
    dashboardId: string,
    name: string,
  ) => Promise<Dashboard | null>;
  migrateFavorites: (dashboardId: string) => Promise<Dashboard | null>;
  toggleSimpleMode: (dashboardId: string) => Promise<Dashboard | null>;
  duplicateCard: (
    dashboardId: string,
    cardId: string,
  ) => Promise<DashboardCard | null>;
  // Tabs
  addTab: (dashboardId: string, name: string) => Promise<Dashboard | null>;
  updateTab: (
    dashboardId: string,
    tabId: string,
    name: string,
  ) => Promise<Dashboard | null>;
  removeTab: (dashboardId: string, tabId: string) => Promise<Dashboard | null>;
  setActiveTab: (dashboardId: string, tabId: string) => void;
  moveCardToTab: (
    dashboardId: string,
    cardId: string,
    tabId: string | null,
  ) => Promise<Dashboard | null>;
  // Export/Import
  exportDashboard: (dashboardId: string) => Promise<Dashboard | null>;
  importDashboard: (data: Dashboard) => Promise<Dashboard | null>;
  // Sharing
  updateSharing: (
    dashboardId: string,
    sharing: DashboardSharing,
  ) => Promise<Dashboard | null>;
  sharedDashboards: Array<{ dashboard: Dashboard; ownerId: string }>;
  fetchSharedDashboards: () => Promise<void>;
  // Generic dashboard metadata update (parameters, kpiCards)
  updateDashboardMeta: (
    dashboardId: string,
    partial: Partial<Pick<Dashboard, "parameters" | "kpiCards">>,
  ) => Promise<Dashboard | null>;
}

export function useMultiDashboard(
  userId: string | undefined,
): UseMultiDashboardReturn {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [activeDashboardId, setActiveDashboardIdState] = useState<
    string | undefined
  >();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const layoutTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [sharedDashboards, setSharedDashboards] = useState<
    Array<{ dashboard: Dashboard; ownerId: string }>
  >([]);

  const ownDashboard =
    dashboards.find((d) => d.id === activeDashboardId) || null;
  const sharedMatch = !ownDashboard
    ? sharedDashboards.find(({ dashboard: sd }) => sd.id === activeDashboardId)
    : undefined;
  const activeDashboard = ownDashboard || sharedMatch?.dashboard || null;
  const activePermission: "owner" | "edit" | "view" = ownDashboard
    ? "owner"
    : sharedMatch?.dashboard.sharing?.sharedWith?.find(
          (s) => s.userId === userId,
        )?.permission === "edit"
      ? "edit"
      : "view";

  const fetchDashboards = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboards?userId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch dashboards");
      const data = await res.json();
      setDashboards(data.dashboards || []);
      setActiveDashboardIdState(data.activeDashboardId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  const createDashboard = useCallback(
    async (name: string): Promise<Dashboard | null> => {
      if (!userId) return null;
      try {
        const res = await fetch("/api/dashboards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, name }),
        });
        if (!res.ok) throw new Error("Failed to create dashboard");
        const dashboard: Dashboard = await res.json();
        setDashboards((prev) => [...prev, dashboard]);
        setActiveDashboardIdState(dashboard.id);
        return dashboard;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    [userId],
  );

  const deleteDashboard = useCallback(
    async (id: string): Promise<boolean> => {
      if (!userId) return false;
      try {
        const res = await fetch(
          `/api/dashboards/${id}?userId=${encodeURIComponent(userId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) return false;
        setDashboards((prev) => {
          const next = prev.filter((d) => d.id !== id);
          if (activeDashboardId === id) {
            setActiveDashboardIdState(next[0]?.id);
          }
          return next;
        });
        return true;
      } catch {
        return false;
      }
    },
    [userId, activeDashboardId],
  );

  const setActiveDashboard = useCallback(
    async (id: string) => {
      setActiveDashboardIdState(id);
      if (!userId) return;
      // Persist active dashboard selection
      fetch("/api/dashboards/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, dashboardId: id }),
      }).catch(() => {});
    },
    [userId],
  );

  const addCard = useCallback(
    async (
      dashboardId: string,
      card: Omit<DashboardCard, "id" | "createdAt">,
    ): Promise<DashboardCard | null> => {
      if (!userId) return null;
      try {
        const res = await fetch(`/api/dashboards/${dashboardId}/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, ...card }),
        });
        if (!res.ok) throw new Error("Failed to add card");
        const newCard: DashboardCard = await res.json();
        // Optimistically add card + layout to local state so it renders immediately
        setDashboards((prev) =>
          prev.map((d) => {
            if (d.id !== dashboardId) return d;
            const existingIds = new Set(d.cards.map((c) => c.id));
            if (existingIds.has(newCard.id)) return d;
            // Compute layout position: place below existing cards
            const maxY = d.layouts.reduce((m, l) => Math.max(m, l.y + l.h), 0);
            const newLayout: CardLayout = {
              i: newCard.id,
              x: 0,
              y: maxY,
              w: 6,
              h: 4,
              minW: 3,
              minH: 4,
            };
            return {
              ...d,
              cards: [...d.cards, newCard],
              layouts: [...d.layouts, newLayout],
            };
          }),
        );
        return newCard;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    [userId],
  );

  const removeCard = useCallback(
    async (dashboardId: string, cardId: string): Promise<boolean> => {
      if (!userId) return false;
      try {
        const res = await fetch(
          `/api/dashboards/${dashboardId}/cards/${cardId}?userId=${encodeURIComponent(userId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) return false;
        setDashboards((prev) =>
          prev.map((d) =>
            d.id === dashboardId
              ? {
                  ...d,
                  cards: d.cards.filter((c) => c.id !== cardId),
                  layouts: d.layouts.filter((l) => l.i !== cardId),
                }
              : d,
          ),
        );
        return true;
      } catch {
        return false;
      }
    },
    [userId],
  );

  const updateCard = useCallback(
    async (
      dashboardId: string,
      cardId: string,
      partial: Partial<DashboardCard>,
    ): Promise<DashboardCard | null> => {
      if (!userId) return null;
      try {
        const res = await fetch(
          `/api/dashboards/${dashboardId}/cards/${cardId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, ...partial }),
          },
        );
        if (!res.ok) throw new Error("Failed to update card");
        const updated: DashboardCard = await res.json();
        setDashboards((prev) =>
          prev.map((d) =>
            d.id === dashboardId
              ? {
                  ...d,
                  cards: d.cards.map((c) => (c.id === cardId ? updated : c)),
                }
              : d,
          ),
        );
        return updated;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    [userId],
  );

  // Debounced layout save (500ms)
  const updateLayouts = useCallback(
    (dashboardId: string, layouts: CardLayout[]) => {
      // Update local state immediately
      setDashboards((prev) =>
        prev.map((d) => (d.id === dashboardId ? { ...d, layouts } : d)),
      );
      // Debounce API call
      if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
      layoutTimerRef.current = setTimeout(async () => {
        if (!userId) return;
        try {
          await fetch(`/api/dashboards/${dashboardId}/layouts`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, layouts }),
          });
        } catch {
          // Silent fail for layout saves
        }
      }, 500);
    },
    [userId],
  );

  const renameDashboard = useCallback(
    async (dashboardId: string, name: string): Promise<Dashboard | null> => {
      if (!userId) return null;
      try {
        const res = await fetch(`/api/dashboards/${dashboardId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, name }),
        });
        if (!res.ok) throw new Error("Failed to rename");
        const updated: Dashboard = await res.json();
        setDashboards((prev) =>
          prev.map((d) => (d.id === dashboardId ? updated : d)),
        );
        return updated;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    [userId],
  );

  const migrateFavorites = useCallback(
    async (dashboardId: string): Promise<Dashboard | null> => {
      if (!userId) return null;
      try {
        const res = await fetch(
          `/api/dashboards/${dashboardId}/migrate-favorites`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          },
        );
        if (!res.ok) throw new Error("Failed to migrate");
        const updated: Dashboard = await res.json();
        setDashboards((prev) =>
          prev.map((d) => (d.id === dashboardId ? updated : d)),
        );
        return updated;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    [userId],
  );

  const toggleSimpleMode = useCallback(
    async (dashboardId: string): Promise<Dashboard | null> => {
      if (!userId) return null;
      const current = dashboards.find((d) => d.id === dashboardId);
      if (!current) return null;
      const newMode = !current.simpleMode;
      // Optimistic update
      setDashboards((prev) =>
        prev.map((d) =>
          d.id === dashboardId ? { ...d, simpleMode: newMode } : d,
        ),
      );
      try {
        const res = await fetch(`/api/dashboards/${dashboardId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, simpleMode: newMode }),
        });
        if (!res.ok) throw new Error("Failed to toggle simple mode");
        return await res.json();
      } catch {
        // Rollback
        setDashboards((prev) =>
          prev.map((d) =>
            d.id === dashboardId ? { ...d, simpleMode: current.simpleMode } : d,
          ),
        );
        return null;
      }
    },
    [userId, dashboards],
  );

  const duplicateCard = useCallback(
    async (
      dashboardId: string,
      cardId: string,
    ): Promise<DashboardCard | null> => {
      const dashboard = dashboards.find((d) => d.id === dashboardId);
      if (!dashboard) return null;
      const card = dashboard.cards.find((c) => c.id === cardId);
      if (!card) return null;
      return addCard(dashboardId, {
        queryName: card.queryName,
        groupId: card.groupId,
        label: card.label + " (copy)",
        defaultFilters: { ...card.defaultFilters },
        autoRun: card.autoRun,
        eventLink: { ...card.eventLink },
        displayMode: card.displayMode,
        compactAuto: card.compactAuto,
        notes: card.notes,
        refreshIntervalSec: card.refreshIntervalSec,
        stompEnabled: card.stompEnabled,
      });
    },
    [dashboards, addCard],
  );

  // ── Tab Methods ──────────────────────────────────────────────────

  const addTab = useCallback(
    async (dashboardId: string, name: string): Promise<Dashboard | null> => {
      if (!userId) return null;
      const dashboard = dashboards.find((d) => d.id === dashboardId);
      if (!dashboard) return null;
      const newTab: DashboardTab = {
        id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        cardIds: [],
        order: dashboard.tabs?.length ?? 0,
      };
      const tabs = [...(dashboard.tabs || []), newTab];
      try {
        const res = await fetch(`/api/dashboards/${dashboardId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, tabs, activeTabId: newTab.id }),
        });
        if (!res.ok) return null;
        const updated: Dashboard = await res.json();
        setDashboards((prev) =>
          prev.map((d) => (d.id === dashboardId ? updated : d)),
        );
        return updated;
      } catch {
        return null;
      }
    },
    [userId, dashboards],
  );

  const updateTab = useCallback(
    async (
      dashboardId: string,
      tabId: string,
      name: string,
    ): Promise<Dashboard | null> => {
      if (!userId) return null;
      const dashboard = dashboards.find((d) => d.id === dashboardId);
      if (!dashboard) return null;
      const tabs = (dashboard.tabs || []).map((t) =>
        t.id === tabId ? { ...t, name } : t,
      );
      try {
        const res = await fetch(`/api/dashboards/${dashboardId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, tabs }),
        });
        if (!res.ok) return null;
        const updated: Dashboard = await res.json();
        setDashboards((prev) =>
          prev.map((d) => (d.id === dashboardId ? updated : d)),
        );
        return updated;
      } catch {
        return null;
      }
    },
    [userId, dashboards],
  );

  const removeTab = useCallback(
    async (dashboardId: string, tabId: string): Promise<Dashboard | null> => {
      if (!userId) return null;
      const dashboard = dashboards.find((d) => d.id === dashboardId);
      if (!dashboard) return null;
      const tabs = (dashboard.tabs || []).filter((t) => t.id !== tabId);
      const activeTabId =
        dashboard.activeTabId === tabId ? tabs[0]?.id : dashboard.activeTabId;
      try {
        const res = await fetch(`/api/dashboards/${dashboardId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, tabs, activeTabId }),
        });
        if (!res.ok) return null;
        const updated: Dashboard = await res.json();
        setDashboards((prev) =>
          prev.map((d) => (d.id === dashboardId ? updated : d)),
        );
        return updated;
      } catch {
        return null;
      }
    },
    [userId, dashboards],
  );

  const setActiveTab = useCallback(
    (dashboardId: string, tabId: string) => {
      setDashboards((prev) =>
        prev.map((d) =>
          d.id === dashboardId ? { ...d, activeTabId: tabId } : d,
        ),
      );
      if (!userId) return;
      fetch(`/api/dashboards/${dashboardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, activeTabId: tabId }),
      }).catch(() => {});
    },
    [userId],
  );

  const moveCardToTab = useCallback(
    async (
      dashboardId: string,
      cardId: string,
      tabId: string | null,
    ): Promise<Dashboard | null> => {
      if (!userId) return null;
      const dashboard = dashboards.find((d) => d.id === dashboardId);
      if (!dashboard) return null;
      const tabs = (dashboard.tabs || []).map((t) => ({
        ...t,
        cardIds: t.cardIds.filter((cid) => cid !== cardId),
      }));
      if (tabId) {
        const tab = tabs.find((t) => t.id === tabId);
        if (tab) tab.cardIds.push(cardId);
      }
      try {
        const res = await fetch(`/api/dashboards/${dashboardId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, tabs }),
        });
        if (!res.ok) return null;
        const updated: Dashboard = await res.json();
        setDashboards((prev) =>
          prev.map((d) => (d.id === dashboardId ? updated : d)),
        );
        return updated;
      } catch {
        return null;
      }
    },
    [userId, dashboards],
  );

  // ── Export/Import ──────────────────────────────────────────────────

  const exportDashboard = useCallback(
    async (dashboardId: string): Promise<Dashboard | null> => {
      if (!userId) return null;
      try {
        const res = await fetch(
          `/api/dashboards/${dashboardId}/export?userId=${encodeURIComponent(userId)}`,
        );
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
    [userId],
  );

  const importDashboard = useCallback(
    async (data: Dashboard): Promise<Dashboard | null> => {
      if (!userId) return null;
      try {
        const res = await fetch("/api/dashboards/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, dashboard: data }),
        });
        if (!res.ok) return null;
        const imported: Dashboard = await res.json();
        setDashboards((prev) => [...prev, imported]);
        setActiveDashboardIdState(imported.id);
        return imported;
      } catch {
        return null;
      }
    },
    [userId],
  );

  // ── Sharing ────────────────────────────────────────────────────────

  const updateSharing = useCallback(
    async (
      dashboardId: string,
      sharing: DashboardSharing,
    ): Promise<Dashboard | null> => {
      if (!userId) return null;
      try {
        const res = await fetch(`/api/dashboards/${dashboardId}/sharing`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, sharing }),
        });
        if (!res.ok) return null;
        const updated: Dashboard = await res.json();
        setDashboards((prev) =>
          prev.map((d) => (d.id === dashboardId ? updated : d)),
        );
        return updated;
      } catch {
        return null;
      }
    },
    [userId],
  );

  const fetchSharedDashboards = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(
        `/api/dashboards/shared?userId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setSharedDashboards(data.dashboards || []);
    } catch {
      // silent
    }
  }, [userId]);

  useEffect(() => {
    fetchSharedDashboards();
  }, [fetchSharedDashboards]);

  // ── Generic metadata update (parameters, kpiCards) ──

  const updateDashboardMeta = useCallback(
    async (
      dashboardId: string,
      partial: Partial<Pick<Dashboard, "parameters" | "kpiCards">>,
    ): Promise<Dashboard | null> => {
      if (!userId) return null;
      // Optimistic local update
      setDashboards((prev) =>
        prev.map((d) => (d.id === dashboardId ? { ...d, ...partial } : d)),
      );
      try {
        const res = await fetch(`/api/dashboards/${dashboardId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, ...partial }),
        });
        if (!res.ok) throw new Error("Failed to update dashboard metadata");
        const updated: Dashboard = await res.json();
        setDashboards((prev) =>
          prev.map((d) => (d.id === dashboardId ? updated : d)),
        );
        return updated;
      } catch (err) {
        // Rollback — re-fetch
        fetchDashboards();
        setError((err as Error).message);
        return null;
      }
    },
    [userId, fetchDashboards],
  );

  return {
    dashboards,
    activeDashboard,
    activePermission,
    loading,
    error,
    fetchDashboards,
    createDashboard,
    deleteDashboard,
    setActiveDashboard,
    addCard,
    removeCard,
    updateCard,
    updateLayouts,
    renameDashboard,
    migrateFavorites,
    toggleSimpleMode,
    duplicateCard,
    addTab,
    updateTab,
    removeTab,
    setActiveTab,
    moveCardToTab,
    exportDashboard,
    importDashboard,
    updateSharing,
    sharedDashboards,
    fetchSharedDashboards,
    updateDashboardMeta,
  };
}
