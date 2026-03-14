'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UserPreferences, FavoriteItem, SubscriptionItem } from '@/types/dashboard';

export function useDashboard(userId: string | undefined) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/preferences?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to fetch preferences');
      const data = await res.json();
      setPreferences(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchPreferences(); }, [fetchPreferences]);

  const addFavorite = useCallback(async (item: { queryName: string; groupId: string; label?: string; defaultFilters?: Record<string, string> }) => {
    if (!userId) return;
    const res = await fetch('/api/preferences/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...item }),
    });
    if (!res.ok) throw new Error('Failed to add favorite');
    const fav: FavoriteItem = await res.json();
    setPreferences((prev) => prev ? { ...prev, favorites: [...prev.favorites, fav] } : prev);
  }, [userId]);

  const removeFavorite = useCallback(async (favoriteId: string) => {
    if (!userId) return;
    const res = await fetch(`/api/preferences/favorites/${favoriteId}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove favorite');
    setPreferences((prev) => prev ? { ...prev, favorites: prev.favorites.filter((f) => f.id !== favoriteId) } : prev);
  }, [userId]);

  const addSubscription = useCallback(async (item: { queryName: string; groupId: string; label?: string; defaultFilters?: Record<string, string>; refreshOnLoad?: boolean }) => {
    if (!userId) return;
    const res = await fetch('/api/preferences/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...item }),
    });
    if (!res.ok) throw new Error('Failed to add subscription');
    const sub: SubscriptionItem = await res.json();
    setPreferences((prev) => prev ? { ...prev, subscriptions: [...prev.subscriptions, sub] } : prev);
  }, [userId]);

  const removeSubscription = useCallback(async (subscriptionId: string) => {
    if (!userId) return;
    const res = await fetch(`/api/preferences/subscriptions/${subscriptionId}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove subscription');
    setPreferences((prev) => prev ? { ...prev, subscriptions: prev.subscriptions.filter((s) => s.id !== subscriptionId) } : prev);
  }, [userId]);

  const clearRecents = useCallback(async () => {
    if (!userId) return;
    await fetch(`/api/preferences/recents?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
    setPreferences((prev) => prev ? { ...prev, recentQueries: [] } : prev);
  }, [userId]);

  return { preferences, loading, error, refresh: fetchPreferences, addFavorite, removeFavorite, addSubscription, removeSubscription, clearRecents };
}
