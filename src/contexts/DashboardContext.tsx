'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface LinkedSelection {
  sourceCardId: string | null;
  column: string | null;
  value: string | null;
}

interface DashboardContextValue {
  // Global business date filter
  businessDate: string | null;
  setBusinessDate: (date: string | null) => void;

  // Shared filters across cards
  sharedFilters: Record<string, string>;
  setSharedFilter: (key: string, value: string) => void;
  clearSharedFilters: () => void;

  // Linked selections
  linkedSelection: LinkedSelection;
  setLinkedSelection: (cardId: string, column: string, value: string) => void;
  clearLinkedSelection: () => void;
}

const defaultLinkedSelection: LinkedSelection = { sourceCardId: null, column: null, value: null };

const DashboardContext = createContext<DashboardContextValue>({
  businessDate: null,
  setBusinessDate: () => {},
  sharedFilters: {},
  setSharedFilter: () => {},
  clearSharedFilters: () => {},
  linkedSelection: defaultLinkedSelection,
  setLinkedSelection: () => {},
  clearLinkedSelection: () => {},
});

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [businessDate, setBusinessDate] = useState<string | null>(null);
  const [sharedFilters, setSharedFilters] = useState<Record<string, string>>({});
  const [linkedSelection, setLinkedSelectionState] = useState<LinkedSelection>(defaultLinkedSelection);

  const setSharedFilter = useCallback((key: string, value: string) => {
    setSharedFilters((prev) => {
      if (!value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const clearSharedFilters = useCallback(() => {
    setSharedFilters({});
  }, []);

  const setLinkedSelection = useCallback((cardId: string, column: string, value: string) => {
    setLinkedSelectionState((prev) => {
      // Toggle off if clicking the same selection
      if (prev.sourceCardId === cardId && prev.column === column && prev.value === value) {
        return defaultLinkedSelection;
      }
      return { sourceCardId: cardId, column, value };
    });
  }, []);

  const clearLinkedSelection = useCallback(() => {
    setLinkedSelectionState(defaultLinkedSelection);
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        businessDate,
        setBusinessDate,
        sharedFilters,
        setSharedFilter,
        clearSharedFilters,
        linkedSelection,
        setLinkedSelection,
        clearLinkedSelection,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  return useContext(DashboardContext);
}
