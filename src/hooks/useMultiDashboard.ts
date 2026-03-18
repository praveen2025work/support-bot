'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Dashboard, DashboardCard, CardLayout, EventLinkConfig } from '@/types/dashboard';

interface UseMultiDashboardReturn {
  dashboards: Dashboard[];
  activeDashboard: Dashboard | null;
  loading: boolean;
  error: string | null;
  fetchDashboards: () => Promise<void>;
  createDashboard: (name: string) => Promise<Dashboard | null>;
  deleteDashboard: (id: string) => Promise<boolean>;
  setActiveDashboard: (id: string) => Promise<void>;
  addCard: (dashboardId: string, card: Omit<DashboardCard, 'id' | 'createdAt'>) => Promise<DashboardCard | null>;
  removeCard: (dashboardId: string, cardId: string) => Promise<boolean>;
  updateCard: (dashboardId: string, cardId: string, partial: Partial<DashboardCard>) => Promise<DashboardCard | null>;
  updateLayouts: (dashboardId: string, layouts: CardLayout[]) => void; // debounced
  renameDashboard: (dashboardId: string, name: string) => Promise<Dashboard | null>;
  migrateFavorites: (dashboardId: string) => Promise<Dashboard | null>;
}

export function useMultiDashboard(userId: string | undefined): UseMultiDashboardReturn {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [activeDashboardId, setActiveDashboardIdState] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const layoutTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId) || null;

  const fetchDashboards = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboards?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to fetch dashboards');
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

  const createDashboard = useCallback(async (name: string): Promise<Dashboard | null> => {
    if (!userId) return null;
    try {
      const res = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name }),
      });
      if (!res.ok) throw new Error('Failed to create dashboard');
      const dashboard: Dashboard = await res.json();
      setDashboards((prev) => [...prev, dashboard]);
      setActiveDashboardIdState(dashboard.id);
      return dashboard;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, [userId]);

  const deleteDashboard = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const res = await fetch(`/api/dashboards/${id}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
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
  }, [userId, activeDashboardId]);

  const setActiveDashboard = useCallback(async (id: string) => {
    setActiveDashboardIdState(id);
    if (!userId) return;
    // Fire-and-forget persistence
    fetch(`/api/dashboards/${id}?userId=${encodeURIComponent(userId)}`, { method: 'GET' }).catch(() => {});
  }, [userId]);

  const addCard = useCallback(async (dashboardId: string, card: Omit<DashboardCard, 'id' | 'createdAt'>): Promise<DashboardCard | null> => {
    if (!userId) return null;
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...card }),
      });
      if (!res.ok) throw new Error('Failed to add card');
      const newCard: DashboardCard = await res.json();
      // Optimistically add card + layout to local state so it renders immediately
      setDashboards((prev) =>
        prev.map((d) => {
          if (d.id !== dashboardId) return d;
          const existingIds = new Set(d.cards.map((c) => c.id));
          if (existingIds.has(newCard.id)) return d;
          // Compute layout position: place below existing cards
          const maxY = d.layouts.reduce((m, l) => Math.max(m, l.y + l.h), 0);
          const newLayout: CardLayout = { i: newCard.id, x: 0, y: maxY, w: 6, h: 4, minW: 3, minH: 4 };
          return { ...d, cards: [...d.cards, newCard], layouts: [...d.layouts, newLayout] };
        })
      );
      return newCard;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, [userId]);

  const removeCard = useCallback(async (dashboardId: string, cardId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/cards/${cardId}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
      if (!res.ok) return false;
      setDashboards((prev) =>
        prev.map((d) =>
          d.id === dashboardId
            ? { ...d, cards: d.cards.filter((c) => c.id !== cardId), layouts: d.layouts.filter((l) => l.i !== cardId) }
            : d
        )
      );
      return true;
    } catch {
      return false;
    }
  }, [userId]);

  const updateCard = useCallback(async (dashboardId: string, cardId: string, partial: Partial<DashboardCard>): Promise<DashboardCard | null> => {
    if (!userId) return null;
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...partial }),
      });
      if (!res.ok) throw new Error('Failed to update card');
      const updated: DashboardCard = await res.json();
      setDashboards((prev) =>
        prev.map((d) =>
          d.id === dashboardId
            ? { ...d, cards: d.cards.map((c) => (c.id === cardId ? updated : c)) }
            : d
        )
      );
      return updated;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, [userId]);

  // Debounced layout save (500ms)
  const updateLayouts = useCallback((dashboardId: string, layouts: CardLayout[]) => {
    // Update local state immediately
    setDashboards((prev) =>
      prev.map((d) => (d.id === dashboardId ? { ...d, layouts } : d))
    );
    // Debounce API call
    if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
    layoutTimerRef.current = setTimeout(async () => {
      if (!userId) return;
      try {
        await fetch(`/api/dashboards/${dashboardId}/layouts`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, layouts }),
        });
      } catch {
        // Silent fail for layout saves
      }
    }, 500);
  }, [userId]);

  const renameDashboard = useCallback(async (dashboardId: string, name: string): Promise<Dashboard | null> => {
    if (!userId) return null;
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name }),
      });
      if (!res.ok) throw new Error('Failed to rename');
      const updated: Dashboard = await res.json();
      setDashboards((prev) => prev.map((d) => (d.id === dashboardId ? updated : d)));
      return updated;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, [userId]);

  const migrateFavorites = useCallback(async (dashboardId: string): Promise<Dashboard | null> => {
    if (!userId) return null;
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/migrate-favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error('Failed to migrate');
      const updated: Dashboard = await res.json();
      setDashboards((prev) => prev.map((d) => (d.id === dashboardId ? updated : d)));
      return updated;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, [userId]);

  return {
    dashboards,
    activeDashboard,
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
  };
}
