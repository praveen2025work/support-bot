"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ExternalDrillDownQuery } from "@/types/dashboard";

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 300_000; // 5 minutes
const EVICTION_INTERVAL_MS = 30_000; // check every 30s
const MAX_REGISTRY_SIZE = 100;

// ── Store (external to React for useSyncExternalStore) ──────────

type Listener = () => void;

function createDrillDownStore() {
  const registry = new Map<string, ExternalDrillDownQuery>();
  const listeners = new Set<Listener>();
  /** Snapshot reference — replaced on every mutation so useSyncExternalStore detects changes */
  let snapshot: ReadonlyMap<string, ExternalDrillDownQuery> = new Map();

  function emit() {
    snapshot = new Map(registry);
    Array.from(listeners).forEach((fn) => fn());
  }

  function register(query: ExternalDrillDownQuery): void {
    const entry: ExternalDrillDownQuery = {
      ...query,
      registeredAt: Date.now(),
      ttlMs: query.ttlMs ?? DEFAULT_TTL_MS,
    };
    // LRU eviction: if at capacity, remove oldest
    if (registry.size >= MAX_REGISTRY_SIZE && !registry.has(entry.id)) {
      let oldestId: string | null = null;
      let oldestTime = Infinity;
      Array.from(registry.entries()).forEach(([id, q]) => {
        if (q.registeredAt < oldestTime) {
          oldestTime = q.registeredAt;
          oldestId = id;
        }
      });
      if (oldestId) registry.delete(oldestId);
    }
    registry.set(entry.id, entry);
    emit();
  }

  function deregister(id: string): void {
    if (registry.delete(id)) emit();
  }

  function deregisterBySource(sourceSystem: string): void {
    let changed = false;
    Array.from(registry.entries()).forEach(([id, q]) => {
      if (q.sourceSystem === sourceSystem) {
        registry.delete(id);
        changed = true;
      }
    });
    if (changed) emit();
  }

  function getMatchingQueries(column: string): ExternalDrillDownQuery[] {
    const colLower = column.toLowerCase().replace(/[_\s-]/g, "");
    const results: ExternalDrillDownQuery[] = [];
    Array.from(registry.values()).forEach((q) => {
      for (const applicable of q.applicableColumns) {
        const aLower = applicable.toLowerCase().replace(/[_\s-]/g, "");
        if (
          aLower === colLower ||
          aLower.includes(colLower) ||
          colLower.includes(aLower)
        ) {
          results.push(q);
          break;
        }
      }
    });
    return results;
  }

  function evictExpired(): void {
    const now = Date.now();
    let changed = false;
    Array.from(registry.entries()).forEach(([id, q]) => {
      const ttl = q.ttlMs ?? DEFAULT_TTL_MS;
      if (now - q.registeredAt > ttl) {
        registry.delete(id);
        changed = true;
      }
    });
    if (changed) emit();
  }

  function getSnapshot(): ReadonlyMap<string, ExternalDrillDownQuery> {
    return snapshot;
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    register,
    deregister,
    deregisterBySource,
    getMatchingQueries,
    evictExpired,
    getSnapshot,
    subscribe,
  };
}

// ── Context ─────────────────────────────────────────────────────

interface ExternalDrillDownContextValue {
  register: (query: ExternalDrillDownQuery) => void;
  deregister: (id: string) => void;
  deregisterBySource: (sourceSystem: string) => void;
  getMatchingQueries: (column: string) => ExternalDrillDownQuery[];
  registry: ReadonlyMap<string, ExternalDrillDownQuery>;
}

const ExternalDrillDownContext =
  createContext<ExternalDrillDownContextValue | null>(null);

export function ExternalDrillDownProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Lazy-init the store via the useRef factory pattern so it's created once
  // per provider mount without re-reading the ref during render.
  const storeRef = useRef<ReturnType<typeof createDrillDownStore> | null>(null);
  storeRef.current ??= createDrillDownStore();
  const store = storeRef.current;

  // TTL eviction interval. Owned by an effect so we don't touch a ref's
  // .current during render and we get clean teardown on unmount.
  useEffect(() => {
    const id = setInterval(() => store.evictExpired(), EVICTION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [store]);

  const registry = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  const value: ExternalDrillDownContextValue = {
    register: useCallback(
      (q: ExternalDrillDownQuery) => store.register(q),
      [store],
    ),
    deregister: useCallback((id: string) => store.deregister(id), [store]),
    deregisterBySource: useCallback(
      (s: string) => store.deregisterBySource(s),
      [store],
    ),
    getMatchingQueries: useCallback(
      (col: string) => store.getMatchingQueries(col),
      [store],
    ),
    registry,
  };

  return (
    <ExternalDrillDownContext.Provider value={value}>
      {children}
    </ExternalDrillDownContext.Provider>
  );
}

export function useExternalDrillDowns(): ExternalDrillDownContextValue {
  const ctx = useContext(ExternalDrillDownContext);
  if (!ctx) {
    // Return a no-op implementation when outside the provider (e.g. chat context)
    return {
      register: () => {},
      deregister: () => {},
      deregisterBySource: () => {},
      getMatchingQueries: () => [],
      registry: new Map(),
    };
  }
  return ctx;
}
