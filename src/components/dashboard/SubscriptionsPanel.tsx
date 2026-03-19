"use client";

import type { SubscriptionItem, QueryInfo } from "@/types/dashboard";
import { X } from "lucide-react";
import { QueryCard } from "./QueryCard";

export function SubscriptionsPanel({
  subscriptions,
  groupId,
  userName,
  availableQueries,
  onRemove,
}: {
  subscriptions: SubscriptionItem[];
  groupId: string;
  userName?: string;
  availableQueries?: QueryInfo[];
  onRemove: (id: string) => Promise<void>;
}) {
  const getQueryFilters = (queryName: string) => {
    return availableQueries?.find((q) => q.name === queryName)?.filters;
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Subscriptions</h2>
        <span className="text-xs text-gray-400">Auto-refresh on load</span>
      </div>
      <div className="flex flex-wrap gap-4 items-start">
        {subscriptions.map((sub) => (
          <QueryCard
            key={sub.id}
            queryName={sub.queryName}
            label={sub.label}
            groupId={sub.groupId || groupId}
            userName={userName}
            defaultFilters={sub.defaultFilters}
            queryFilters={getQueryFilters(sub.queryName)}
            autoExecute={sub.refreshOnLoad}
            actions={
              <button
                onClick={() => onRemove(sub.id)}
                title="Unsubscribe"
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            }
          />
        ))}
      </div>
    </section>
  );
}
