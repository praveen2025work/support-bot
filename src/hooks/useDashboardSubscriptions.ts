'use client';

import { useState, useCallback } from 'react';
import type { DashboardSubscription } from '@/types/dashboard';

export function useDashboardSubscriptions(userId: string) {
  const [subscriptions, setSubscriptions] = useState<DashboardSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(true);

  const fetchSubscriptions = useCallback(async (dashboardId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/subscriptions?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
      setEmailConfigured(data.emailConfigured !== false);
    } catch {
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const subscribe = useCallback(async (dashboardId: string, email: string, cronExpression: string) => {
    const res = await fetch(`/api/dashboards/${dashboardId}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, cronExpression }),
    });
    if (!res.ok) throw new Error('Failed to subscribe');
    const sub: DashboardSubscription = await res.json();
    setSubscriptions((prev) => [...prev, sub]);
    return sub;
  }, [userId]);

  const unsubscribe = useCallback(async (dashboardId: string, subId: string) => {
    const res = await fetch(`/api/dashboards/${dashboardId}/subscriptions/${subId}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to unsubscribe');
    setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
  }, [userId]);

  const updateSubscription = useCallback(async (dashboardId: string, subId: string, updates: Partial<DashboardSubscription>) => {
    const res = await fetch(`/api/dashboards/${dashboardId}/subscriptions/${subId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...updates }),
    });
    if (!res.ok) throw new Error('Failed to update');
    const updated: DashboardSubscription = await res.json();
    setSubscriptions((prev) => prev.map((s) => (s.id === subId ? updated : s)));
    return updated;
  }, [userId]);

  const sendNow = useCallback(async (dashboardId: string, subId: string) => {
    const res = await fetch(`/api/dashboards/${dashboardId}/subscriptions/${subId}/send-now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to send');
    return res.json();
  }, [userId]);

  return { subscriptions, loading, emailConfigured, fetchSubscriptions, subscribe, unsubscribe, updateSubscription, sendNow };
}
