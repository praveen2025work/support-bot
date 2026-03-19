"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SSEEvent {
  type: string;
  data: unknown;
  timestamp: number;
}

export function useSSE(url: string, enabled = true) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const connectRef = useRef<() => void>();

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const source = new EventSource(url);
      sourceRef.current = source;

      source.addEventListener("connected", () => {
        setConnected(true);
      });

      source.addEventListener("chat_message", (e) => {
        try {
          const data = JSON.parse(e.data);
          setEvents((prev) => [
            ...prev.slice(-99),
            { type: "chat_message", data, timestamp: Date.now() },
          ]);
        } catch {
          // ignore parse errors
        }
      });

      source.addEventListener("query_executed", (e) => {
        try {
          const data = JSON.parse(e.data);
          setEvents((prev) => [
            ...prev.slice(-99),
            { type: "query_executed", data, timestamp: Date.now() },
          ]);
        } catch {
          // ignore
        }
      });

      source.onerror = () => {
        setConnected(false);
        source.close();
        // Reconnect after 5 seconds
        setTimeout(() => connectRef.current?.(), 5000);
      };
    } catch {
      setConnected(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    // setState calls inside connect() happen asynchronously via EventSource callbacks
    // eslint-disable-next-line react-hooks/set-state-in-effect
    connect();
    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [connect]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, connected, clearEvents };
}
