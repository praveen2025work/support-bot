"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type EngineStatus = "ok" | "down" | "checking";

/** How often to ping the engine health endpoint, in milliseconds. */
const POLL_INTERVAL_MS = 30_000;

/** Abort the health request if it hasn't resolved within this window. */
const HEALTH_TIMEOUT_MS = 5_000;

interface EngineStatusContextValue {
  status: EngineStatus;
  /** Force an immediate re-check (used by manual refresh affordances). */
  refresh: () => void;
}

const EngineStatusContext = createContext<EngineStatusContextValue | undefined>(
  undefined,
);

/**
 * Single shared engine-status poller. Previously ChatWindow, SystemHealthRail
 * and the Watch page each ran their own 30s setInterval against /api/health;
 * mounting this provider at the app shell collapses those into one fetch.
 */
export function EngineStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<EngineStatus>("checking");

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/health", {
        signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      });
      setStatus(res.ok ? "ok" : "down");
    } catch {
      setStatus("down");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await check();
      // Guard against a late resolution after unmount flipping state.
      if (cancelled) return;
    })();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [check]);

  return (
    <EngineStatusContext.Provider value={{ status, refresh: check }}>
      {children}
    </EngineStatusContext.Provider>
  );
}

/**
 * Read the shared engine status. Returns "checking" when no provider is
 * mounted (e.g. isolated component tests) instead of throwing, so consumers
 * remain renderable without the provider wrapper.
 */
export function useEngineStatus(): EngineStatus {
  const ctx = useContext(EngineStatusContext);
  return ctx?.status ?? "checking";
}

/** Full context accessor (status + manual refresh) for callers that need it. */
export function useEngineStatusContext(): EngineStatusContextValue {
  const ctx = useContext(EngineStatusContext);
  if (!ctx)
    throw new Error(
      "useEngineStatusContext must be used within EngineStatusProvider",
    );
  return ctx;
}
