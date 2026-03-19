"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { EventLinkConfig } from "@/types/dashboard";

// ── Types ────────────────────────────────────────────────────────────

export interface DashboardEvent {
  sourceCardId: string;
  column: string;
  value: string;
  timestamp: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, string>;
  createdAt: string;
}

interface DashboardContextValue {
  // Global business date filter
  businessDate: string | null;
  setBusinessDate: (date: string | null) => void;

  // Shared filters across cards
  sharedFilters: Record<string, string>;
  /** Generation counter — bumped on every setSharedFilter call so listeners
   *  can detect "re-broadcasts" of the same value (e.g. user re-runs a card). */
  sharedFilterGeneration: number;
  setSharedFilter: (key: string, value: string) => void;
  clearSharedFilters: () => void;

  // Cross-card event system
  activeEvents: DashboardEvent[];
  broadcastEvent: (cardId: string, column: string, value: string) => void;
  clearEvent: (column: string) => void;
  clearAllEvents: () => void;

  // Per-card link config registry
  registerCardLinkConfig: (cardId: string, config: EventLinkConfig) => void;
  unregisterCard: (cardId: string) => void;

  // Compute applicable filters for a given card
  getApplicableFilters: (
    cardId: string,
    ownFilterKeys: string[],
  ) => Record<string, string>;

  // Backward-compatible linked selection (derived from activeEvents)
  linkedSelection: {
    sourceCardId: string | null;
    column: string | null;
    value: string | null;
  };
  setLinkedSelection: (cardId: string, column: string, value: string) => void;
  clearLinkedSelection: () => void;

  // Filter presets (bookmarks)
  filterPresets: FilterPreset[];
  saveFilterPreset: (name: string) => void;
  loadFilterPreset: (id: string) => void;
  deleteFilterPreset: (id: string) => void;
}

// ── Provider ─────────────────────────────────────────────────────────

const defaultLinkedSelection = {
  sourceCardId: null,
  column: null,
  value: null,
};

const DashboardContext = createContext<DashboardContextValue>({
  businessDate: null,
  setBusinessDate: () => {},
  sharedFilters: {},
  sharedFilterGeneration: 0,
  setSharedFilter: () => {},
  clearSharedFilters: () => {},
  activeEvents: [],
  broadcastEvent: () => {},
  clearEvent: () => {},
  clearAllEvents: () => {},
  registerCardLinkConfig: () => {},
  unregisterCard: () => {},
  getApplicableFilters: () => ({}),
  linkedSelection: defaultLinkedSelection,
  setLinkedSelection: () => {},
  clearLinkedSelection: () => {},
  filterPresets: [],
  saveFilterPreset: () => {},
  loadFilterPreset: () => {},
  deleteFilterPreset: () => {},
});

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [businessDate, setBusinessDate] = useState<string | null>(null);
  const [sharedFilters, setSharedFilters] = useState<Record<string, string>>(
    {},
  );
  const [sharedFilterGeneration, setSharedFilterGeneration] = useState(0);
  const [activeEvents, setActiveEvents] = useState<DashboardEvent[]>([]);
  const cardLinkConfigsRef = useRef<Map<string, EventLinkConfig>>(new Map());

  // ── Filter presets (bookmarks) ──
  const PRESETS_KEY = "dashboard_filter_presets";
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const persistPresets = useCallback((presets: FilterPreset[]) => {
    setFilterPresets(presets);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    } catch {}
  }, []);

  const saveFilterPreset = useCallback(
    (name: string) => {
      const preset: FilterPreset = {
        id: `preset_${Date.now()}`,
        name,
        filters: { ...sharedFilters },
        createdAt: new Date().toISOString(),
      };
      persistPresets([...filterPresets, preset]);
    },
    [sharedFilters, filterPresets, persistPresets],
  );

  const loadFilterPreset = useCallback(
    (id: string) => {
      const preset = filterPresets.find((p) => p.id === id);
      if (!preset) return;
      setSharedFilters(preset.filters);
      setSharedFilterGeneration((g) => g + 1);
    },
    [filterPresets],
  );

  const deleteFilterPreset = useCallback(
    (id: string) => {
      persistPresets(filterPresets.filter((p) => p.id !== id));
    },
    [filterPresets, persistPresets],
  );

  // ── Shared filters ──

  const setSharedFilter = useCallback((key: string, value: string) => {
    setSharedFilters((prev) => {
      if (!value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
    // Always bump generation so listeners detect re-broadcasts of same value
    setSharedFilterGeneration((g) => g + 1);
  }, []);

  const clearSharedFilters = useCallback(() => {
    setSharedFilters({});
    setSharedFilterGeneration((g) => g + 1);
  }, []);

  // ── Cross-card events ──

  const broadcastEvent = useCallback(
    (cardId: string, column: string, value: string) => {
      setActiveEvents((prev) => {
        // Toggle: if same event exists, remove it
        const existing = prev.find(
          (e) =>
            e.sourceCardId === cardId &&
            e.column === column &&
            e.value === value,
        );
        if (existing) {
          return prev.filter((e) => e !== existing);
        }
        // Replace any existing event for same column (one active filter per column)
        const filtered = prev.filter((e) => e.column !== column);
        return [
          ...filtered,
          { sourceCardId: cardId, column, value, timestamp: Date.now() },
        ];
      });
    },
    [],
  );

  const clearEvent = useCallback((column: string) => {
    setActiveEvents((prev) => prev.filter((e) => e.column !== column));
  }, []);

  const clearAllEvents = useCallback(() => setActiveEvents([]), []);

  // ── Card link config registry ──

  const registerCardLinkConfig = useCallback(
    (cardId: string, config: EventLinkConfig) => {
      cardLinkConfigsRef.current.set(cardId, config);
    },
    [],
  );

  const unregisterCard = useCallback((cardId: string) => {
    cardLinkConfigsRef.current.delete(cardId);
  }, []);

  // ── Compute applicable filters ──

  const getApplicableFilters = useCallback(
    (cardId: string, ownFilterKeys: string[]): Record<string, string> => {
      const config = cardLinkConfigsRef.current.get(cardId) || {
        mode: "auto" as const,
      };
      if (config.mode === "disabled") return {};

      const result: Record<string, string> = {};
      const lowerKeys = ownFilterKeys.map((k) => k.toLowerCase());
      const ignoreSet = new Set(
        (config.ignoreColumns || []).map((c) => c.toLowerCase()),
      );

      for (const event of activeEvents) {
        // Skip events from self
        if (event.sourceCardId === cardId) continue;

        const eventCol = event.column.toLowerCase();
        if (ignoreSet.has(eventCol)) continue;

        if (config.mode === "manual" && config.columnMappings) {
          // Manual: use explicit mapping
          const targetKey =
            config.columnMappings[event.column] ||
            config.columnMappings[eventCol];
          if (targetKey) {
            result[targetKey] = event.value;
          }
        } else {
          // Auto: match by column name (case-insensitive)
          const matchIdx = lowerKeys.findIndex(
            (k) =>
              k === eventCol ||
              k.replace(/_/g, "") === eventCol.replace(/_/g, ""),
          );
          if (matchIdx >= 0) {
            result[ownFilterKeys[matchIdx]] = event.value;
          }
        }
      }

      return result;
    },
    [activeEvents],
  );

  // ── Backward-compatible linkedSelection ──

  const linkedSelection =
    activeEvents.length > 0
      ? {
          sourceCardId: activeEvents[activeEvents.length - 1].sourceCardId,
          column: activeEvents[activeEvents.length - 1].column,
          value: activeEvents[activeEvents.length - 1].value,
        }
      : defaultLinkedSelection;

  const setLinkedSelection = useCallback(
    (cardId: string, column: string, value: string) => {
      broadcastEvent(cardId, column, value);
    },
    [broadcastEvent],
  );

  const clearLinkedSelection = useCallback(
    () => clearAllEvents(),
    [clearAllEvents],
  );

  return (
    <DashboardContext.Provider
      value={{
        businessDate,
        setBusinessDate,
        sharedFilters,
        sharedFilterGeneration,
        setSharedFilter,
        clearSharedFilters,
        activeEvents,
        broadcastEvent,
        clearEvent,
        clearAllEvents,
        registerCardLinkConfig,
        unregisterCard,
        getApplicableFilters,
        linkedSelection,
        setLinkedSelection,
        clearLinkedSelection,
        filterPresets,
        saveFilterPreset,
        loadFilterPreset,
        deleteFilterPreset,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  return useContext(DashboardContext);
}
