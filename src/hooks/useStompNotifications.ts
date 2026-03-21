"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Client, type IMessage } from "@stomp/stompjs";
import type { DashboardCard } from "@/types/dashboard";

// ── Types ────────────────────────────────────────────────────────────

export type StompConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/** Message format from the WebSocket broker */
export interface StompNotification {
  /** Must be "chatbot" for this app to process */
  application?: string;
  /** Query name to match against dashboard cards */
  queryName?: string;
  /** Optional filters that must match the card's current filters */
  filters?: Record<string, string>;
  /** Optional: specific card IDs to refresh */
  cardIds?: string[];
  /** Optional: action type for action panel integration */
  action?: string;
  /** Any additional payload from the source application */
  [key: string]: unknown;
}

interface UseStompNotificationsOptions {
  /** WebSocket broker URL (e.g. ws://localhost:15674/ws) */
  brokerUrl?: string;
  /** STOMP subscription destination (e.g. /topic/notifications) */
  destination?: string;
  /** Dashboard cards to match against incoming events */
  cards?: DashboardCard[];
  /** Callback when a card should be refreshed */
  onCardRefresh?: (cardId: string, notification: StompNotification) => void;
  /** Callback for any chatbot notification (for action panel, etc.) */
  onNotification?: (notification: StompNotification) => void;
  /** Whether to connect (disable when no dashboard is active) */
  enabled?: boolean;
}

interface UseStompNotificationsReturn {
  status: StompConnectionStatus;
  /** Per-card refresh counter — incremented when STOMP triggers a refresh */
  refreshTriggers: Record<string, number>;
  /** Last notification received */
  lastNotification: StompNotification | null;
  /** Manually trigger reconnect */
  reconnect: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useStompNotifications({
  brokerUrl,
  destination = "/topic/notifications",
  cards = [],
  onCardRefresh,
  onNotification,
  enabled = true,
}: UseStompNotificationsOptions): UseStompNotificationsReturn {
  const [status, setStatus] = useState<StompConnectionStatus>("disconnected");
  const [refreshTriggers, setRefreshTriggers] = useState<
    Record<string, number>
  >({});
  const [lastNotification, setLastNotification] =
    useState<StompNotification | null>(null);
  const clientRef = useRef<Client | null>(null);
  const cardsRef = useRef(cards);
  const onCardRefreshRef = useRef(onCardRefresh);
  const onNotificationRef = useRef(onNotification);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);
  useEffect(() => {
    onCardRefreshRef.current = onCardRefresh;
  }, [onCardRefresh]);
  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  const handleMessage = useCallback((message: IMessage) => {
    try {
      const body: StompNotification = JSON.parse(message.body);

      // Filter: only process messages for this application
      if (body.application === undefined || body.application !== "chatbot") {
        return;
      }

      setLastNotification(body);
      onNotificationRef.current?.(body);

      // Determine which cards to refresh
      const currentCards = cardsRef.current;
      const matchedCardIds: string[] = [];

      if (body.cardIds && body.cardIds.length > 0) {
        // Explicit card IDs specified
        for (const id of body.cardIds) {
          if (currentCards.some((c) => c.id === id)) {
            matchedCardIds.push(id);
          }
        }
      } else if (body.queryName) {
        // Match by queryName and optional filters
        for (const card of currentCards) {
          if (card.queryName !== body.queryName) continue;

          // If notification specifies filters, card must have matching filters
          if (body.filters && Object.keys(body.filters).length > 0) {
            const cardFilters = card.defaultFilters || {};
            const matches = Object.entries(body.filters).every(
              ([key, val]) => cardFilters[key] === val,
            );
            if (!matches) continue;
          }

          matchedCardIds.push(card.id);
        }
      } else {
        // No queryName or cardIds — refresh all cards
        for (const card of currentCards) {
          matchedCardIds.push(card.id);
        }
      }

      if (matchedCardIds.length > 0) {
        setRefreshTriggers((prev) => {
          const next = { ...prev };
          for (const id of matchedCardIds) {
            next[id] = (next[id] || 0) + 1;
          }
          return next;
        });

        for (const id of matchedCardIds) {
          onCardRefreshRef.current?.(id, body);
        }
      }
    } catch {
      // Ignore malformed messages
    }
  }, []);

  const connect = useCallback(() => {
    if (!brokerUrl || !enabled) return;

    // Disconnect existing
    if (clientRef.current?.active) {
      clientRef.current.deactivate();
    }

    setStatus("connecting");

    const client = new Client({
      brokerURL: brokerUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setStatus("connected");
        client.subscribe(destination, handleMessage);
      },
      onStompError: () => {
        setStatus("error");
      },
      onDisconnect: () => {
        setStatus("disconnected");
      },
      onWebSocketClose: () => {
        // Will auto-reconnect via reconnectDelay
        setStatus("connecting");
      },
    });

    clientRef.current = client;
    client.activate();
  }, [brokerUrl, destination, enabled, handleMessage]);

  const reconnect = useCallback(() => {
    if (clientRef.current?.active) {
      clientRef.current.deactivate();
    }
    connect();
  }, [connect]);

  useEffect(() => {
    if (enabled && brokerUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Connection lifecycle: setState via connect() is required for STOMP status tracking
      connect();
    }
    return () => {
      if (clientRef.current?.active) {
        clientRef.current.deactivate();
      }
    };
  }, [enabled, brokerUrl, connect]);

  return { status, refreshTriggers, lastNotification, reconnect };
}
