'use client';

import type { SubscriptionItem } from '@/types/dashboard';
import { QueryCard } from './QueryCard';

export function SubscriptionsPanel({
  subscriptions,
  groupId,
  userName,
  onRemove,
}: {
  subscriptions: SubscriptionItem[];
  groupId: string;
  userName?: string;
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Subscriptions</h2>
        <span className="text-xs text-gray-400">Auto-refresh on load</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subscriptions.map((sub) => (
          <QueryCard
            key={sub.id}
            queryName={sub.queryName}
            label={sub.label}
            groupId={sub.groupId || groupId}
            userName={userName}
            defaultFilters={sub.defaultFilters}
            autoExecute={sub.refreshOnLoad}
            actions={
              <button
                onClick={() => onRemove(sub.id)}
                title="Unsubscribe"
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            }
          />
        ))}
      </div>
    </section>
  );
}
