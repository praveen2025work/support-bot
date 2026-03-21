import { promises as fs } from "fs";
import path from "path";
import { logger } from "@/lib/logger";
import { paths } from "@/lib/env-config";

const PREFS_DIR = paths.data.preferencesDir;
const MAX_RECENTS = 50;

export interface FavoriteItem {
  id: string;
  queryName: string;
  groupId: string;
  label: string;
  defaultFilters: Record<string, string>;
  createdAt: string;
}

export interface SubscriptionItem {
  id: string;
  queryName: string;
  groupId: string;
  label: string;
  defaultFilters: Record<string, string>;
  refreshOnLoad: boolean;
  createdAt: string;
}

export interface RecentQuery {
  queryName: string;
  groupId: string;
  userMessage: string;
  intent: string;
  timestamp: string;
  executionMs?: number;
}

export interface CardLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface EventLinkConfig {
  mode: "auto" | "manual" | "disabled";
  columnMappings?: Record<string, string>;
  ignoreColumns?: string[];
}

export interface DashboardCard {
  id: string;
  queryName: string;
  groupId: string;
  label: string;
  defaultFilters: Record<string, string>;
  autoRun: boolean;
  eventLink: EventLinkConfig;
  /** Display mode: auto, table, chart */
  displayMode?: "auto" | "table" | "chart";
  notes?: string;
  refreshIntervalSec?: number;
  /** Enable STOMP WebSocket live refresh for this card */
  stompEnabled?: boolean;
  migratedFromFavoriteId?: string;
  createdAt: string;
}

export interface DashboardTab {
  id: string;
  name: string;
  cardIds: string[];
  order: number;
}

export interface DashboardShareEntry {
  userId: string;
  permission: "view" | "edit";
}

export interface DashboardSharing {
  isPublic?: boolean;
  sharedWith: DashboardShareEntry[];
  ownerId: string;
}

export interface FilterDependency {
  parentFilter: string;
  childFilter: string;
  sourceUrl?: string;
}

export interface DashboardParameter {
  id: string;
  name: string;
  label: string;
  type: "text" | "select" | "date" | "daterange" | "number";
  defaultValue: string;
  options?: string[];
  min?: number;
  max?: number;
}

export interface KpiCardConfig {
  title: string;
  queryName: string;
  valueField: string;
  previousValueField?: string;
  unit?: string;
  prefix?: string;
  format?: "number" | "currency" | "percent";
  thresholds?: { warning: number; danger: number };
  trendLabel?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  cards: DashboardCard[];
  layouts: CardLayout[];
  simpleMode?: boolean;
  globalRefreshSec?: number;
  tabs?: DashboardTab[];
  activeTabId?: string;
  sharing?: DashboardSharing;
  filterDependencies?: FilterDependency[];
  /** Master toggle for STOMP WebSocket live notifications on this dashboard */
  stompEnabled?: boolean;
  /** Dashboard parameters for global filters */
  parameters?: DashboardParameter[];
  /** KPI scorecard cards at the top of the dashboard */
  kpiCards?: KpiCardConfig[];
  createdAt: string;
  updatedAt: string;
}

// ── Grid Board View Preferences ───────────────────────────────────

export interface ConditionalFormatRule {
  id: string;
  column: string;
  operator: "gt" | "lt" | "eq" | "neq" | "contains" | "between";
  value: string;
  value2?: string;
  style: { bg?: string; color?: string; bold?: boolean };
}

export interface GridBoardView {
  id: string;
  queryName: string;
  viewName: string;
  columnOrder: string[];
  hiddenColumns: string[];
  columnWidths: Record<string, number>;
  pinnedColumns: string[];
  sortConfig: Array<{ column: string; direction: "asc" | "desc" }>;
  groupByColumn?: string;
  clientFilters: Record<string, { operator: string; value: string }>;
  pageSize: number;
  conditionalFormats: ConditionalFormatRule[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  favorites: FavoriteItem[];
  subscriptions: SubscriptionItem[];
  recentQueries: RecentQuery[];
  dashboards: Dashboard[];
  activeDashboardId?: string;
  gridBoardViews: GridBoardView[];
  updatedAt: string;
}

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function prefsPath(userId: string): string {
  // Sanitize userId to prevent path traversal
  const safe = userId.replace(/[^a-zA-Z0-9_\-]/g, "_");
  return path.join(PREFS_DIR, `${safe}.json`);
}

function defaultPrefs(userId: string): UserPreferences {
  return {
    userId,
    favorites: [],
    subscriptions: [],
    recentQueries: [],
    dashboards: [],
    gridBoardViews: [],
    updatedAt: new Date().toISOString(),
  };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `dashboard-${Date.now()}`
  );
}

export class UserPreferencesStore {
  // Per-user write locks to prevent concurrent read-modify-write races
  private locks = new Map<string, Promise<void>>();

  /**
   * Acquire a per-user lock. All write operations go through this to ensure
   * only one read-modify-write cycle runs at a time for a given userId.
   */
  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const key = userId;
    // Chain onto any existing lock for this user
    const prev = this.locks.get(key) ?? Promise.resolve();
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(key, next);
    try {
      await prev; // wait for previous operation to finish
      return await fn();
    } finally {
      release!();
      // Clean up if we're the last in the chain
      if (this.locks.get(key) === next) {
        this.locks.delete(key);
      }
    }
  }

  async read(userId: string): Promise<UserPreferences> {
    try {
      const raw = await fs.readFile(prefsPath(userId), "utf-8");
      return JSON.parse(raw);
    } catch {
      return defaultPrefs(userId);
    }
  }

  private async write(prefs: UserPreferences): Promise<void> {
    await fs.mkdir(PREFS_DIR, { recursive: true });
    prefs.updatedAt = new Date().toISOString();
    // Atomic write: write to temp file then rename to prevent partial reads
    const target = prefsPath(prefs.userId);
    const tmp = target + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(prefs, null, 2), "utf-8");
    await fs.rename(tmp, target);
  }

  async addFavorite(
    userId: string,
    item: Omit<FavoriteItem, "id" | "createdAt">,
  ): Promise<FavoriteItem> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      const fav: FavoriteItem = {
        ...item,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      prefs.favorites.push(fav);
      await this.write(prefs);
      return fav;
    });
  }

  async removeFavorite(userId: string, favoriteId: string): Promise<boolean> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      const before = prefs.favorites.length;
      prefs.favorites = prefs.favorites.filter((f) => f.id !== favoriteId);
      if (prefs.favorites.length === before) return false;
      await this.write(prefs);
      return true;
    });
  }

  async addSubscription(
    userId: string,
    item: Omit<SubscriptionItem, "id" | "createdAt">,
  ): Promise<SubscriptionItem> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      const sub: SubscriptionItem = {
        ...item,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      prefs.subscriptions.push(sub);
      await this.write(prefs);
      return sub;
    });
  }

  async removeSubscription(
    userId: string,
    subscriptionId: string,
  ): Promise<boolean> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      const before = prefs.subscriptions.length;
      prefs.subscriptions = prefs.subscriptions.filter(
        (s) => s.id !== subscriptionId,
      );
      if (prefs.subscriptions.length === before) return false;
      await this.write(prefs);
      return true;
    });
  }

  async appendRecent(userId: string, recent: RecentQuery): Promise<void> {
    return this.withLock(userId, async () => {
      try {
        const prefs = await this.read(userId);
        prefs.recentQueries.unshift(recent);
        if (prefs.recentQueries.length > MAX_RECENTS) {
          prefs.recentQueries = prefs.recentQueries.slice(0, MAX_RECENTS);
        }
        await this.write(prefs);
      } catch (err) {
        logger.warn({ err, userId }, "Failed to append recent query");
      }
    });
  }

  async clearRecents(userId: string): Promise<void> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      prefs.recentQueries = [];
      await this.write(prefs);
    });
  }

  async update(
    userId: string,
    partial: Partial<Pick<UserPreferences, "favorites" | "subscriptions">>,
  ): Promise<UserPreferences> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      if (partial.favorites) prefs.favorites = partial.favorites;
      if (partial.subscriptions) prefs.subscriptions = partial.subscriptions;
      await this.write(prefs);
      return prefs;
    });
  }

  // ── Dashboard Methods ──────────────────────────────────────────────

  async listDashboards(userId: string): Promise<Dashboard[]> {
    const prefs = await this.read(userId);
    return prefs.dashboards || [];
  }

  async getDashboard(
    userId: string,
    dashboardId: string,
  ): Promise<Dashboard | null> {
    const prefs = await this.read(userId);
    return (prefs.dashboards || []).find((d) => d.id === dashboardId) || null;
  }

  async createDashboard(
    userId: string,
    input: { name: string; cards?: DashboardCard[]; layouts?: CardLayout[] },
  ): Promise<Dashboard> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      if (!prefs.dashboards) prefs.dashboards = [];
      const baseSlug = slugify(input.name);
      let id = baseSlug;
      let suffix = 1;
      while (prefs.dashboards.some((d) => d.id === id)) {
        id = `${baseSlug}-${suffix++}`;
      }
      const now = new Date().toISOString();
      const dashboard: Dashboard = {
        id,
        name: input.name,
        cards: input.cards || [],
        layouts: input.layouts || [],
        createdAt: now,
        updatedAt: now,
      };
      prefs.dashboards.push(dashboard);
      prefs.activeDashboardId = id;
      await this.write(prefs);
      return dashboard;
    });
  }

  async updateDashboard(
    userId: string,
    dashboardId: string,
    partial: Partial<
      Pick<
        Dashboard,
        | "name"
        | "cards"
        | "layouts"
        | "simpleMode"
        | "globalRefreshSec"
        | "tabs"
        | "activeTabId"
        | "sharing"
        | "filterDependencies"
        | "stompEnabled"
        | "parameters"
        | "kpiCards"
      >
    >,
  ): Promise<Dashboard | null> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      const dash = (prefs.dashboards || []).find((d) => d.id === dashboardId);
      if (!dash) return null;
      if (partial.name !== undefined) dash.name = partial.name;
      if (partial.cards !== undefined) dash.cards = partial.cards;
      if (partial.layouts !== undefined) dash.layouts = partial.layouts;
      if (partial.simpleMode !== undefined)
        dash.simpleMode = partial.simpleMode;
      if (partial.globalRefreshSec !== undefined)
        dash.globalRefreshSec = partial.globalRefreshSec;
      if (partial.tabs !== undefined) dash.tabs = partial.tabs;
      if (partial.activeTabId !== undefined)
        dash.activeTabId = partial.activeTabId;
      if (partial.sharing !== undefined) dash.sharing = partial.sharing;
      if (partial.filterDependencies !== undefined)
        dash.filterDependencies = partial.filterDependencies;
      if (partial.stompEnabled !== undefined)
        dash.stompEnabled = partial.stompEnabled;
      if (partial.parameters !== undefined)
        dash.parameters = partial.parameters;
      if (partial.kpiCards !== undefined) dash.kpiCards = partial.kpiCards;
      dash.updatedAt = new Date().toISOString();
      await this.write(prefs);
      return dash;
    });
  }

  async deleteDashboard(userId: string, dashboardId: string): Promise<boolean> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      const before = (prefs.dashboards || []).length;
      prefs.dashboards = (prefs.dashboards || []).filter(
        (d) => d.id !== dashboardId,
      );
      if (prefs.dashboards.length === before) return false;
      if (prefs.activeDashboardId === dashboardId) {
        prefs.activeDashboardId = prefs.dashboards[0]?.id;
      }
      await this.write(prefs);
      return true;
    });
  }

  async updateDashboardLayouts(
    userId: string,
    dashboardId: string,
    layouts: CardLayout[],
  ): Promise<Dashboard | null> {
    return this.updateDashboard(userId, dashboardId, { layouts });
  }

  async addCardToDashboard(
    userId: string,
    dashboardId: string,
    card: Omit<DashboardCard, "id" | "createdAt">,
  ): Promise<DashboardCard | null> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      const dash = (prefs.dashboards || []).find((d) => d.id === dashboardId);
      if (!dash) return null;
      const newCard: DashboardCard = {
        ...card,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      dash.cards.push(newCard);
      const maxY = dash.layouts.reduce((m, l) => Math.max(m, l.y + l.h), 0);
      const colCount = dash.cards.length - 1;
      dash.layouts.push({
        i: newCard.id,
        x: (colCount % 3) * 4,
        y: maxY + Math.floor(colCount / 3) * 6,
        w: 4,
        h: 6,
        minW: 3,
        minH: 4,
      });
      dash.updatedAt = new Date().toISOString();
      await this.write(prefs);
      return newCard;
    });
  }

  async removeCardFromDashboard(
    userId: string,
    dashboardId: string,
    cardId: string,
  ): Promise<boolean> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      const dash = (prefs.dashboards || []).find((d) => d.id === dashboardId);
      if (!dash) return false;
      const before = dash.cards.length;
      dash.cards = dash.cards.filter((c) => c.id !== cardId);
      dash.layouts = dash.layouts.filter((l) => l.i !== cardId);
      if (dash.cards.length === before) return false;
      dash.updatedAt = new Date().toISOString();
      await this.write(prefs);
      return true;
    });
  }

  async updateCard(
    userId: string,
    dashboardId: string,
    cardId: string,
    partial: Partial<DashboardCard>,
  ): Promise<DashboardCard | null> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      const dash = (prefs.dashboards || []).find((d) => d.id === dashboardId);
      if (!dash) return null;
      const card = dash.cards.find((c) => c.id === cardId);
      if (!card) return null;
      Object.assign(card, partial, { id: cardId });
      dash.updatedAt = new Date().toISOString();
      await this.write(prefs);
      return card;
    });
  }

  async setActiveDashboard(userId: string, dashboardId: string): Promise<void> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      prefs.activeDashboardId = dashboardId;
      await this.write(prefs);
    });
  }

  async migrateFavoritesToDashboard(
    userId: string,
    dashboardId: string,
  ): Promise<Dashboard | null> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      const dash = (prefs.dashboards || []).find((d) => d.id === dashboardId);
      if (!dash) return null;

      const existingMigrated = new Set(
        dash.cards
          .filter((c) => c.migratedFromFavoriteId)
          .map((c) => c.migratedFromFavoriteId),
      );
      let added = 0;

      for (const fav of prefs.favorites) {
        if (existingMigrated.has(fav.id)) continue;
        const card: DashboardCard = {
          id: uid(),
          queryName: fav.queryName,
          groupId: fav.groupId,
          label: fav.label,
          defaultFilters: fav.defaultFilters,
          autoRun: false,
          eventLink: { mode: "auto" },
          migratedFromFavoriteId: fav.id,
          createdAt: new Date().toISOString(),
        };
        dash.cards.push(card);
        dash.layouts.push({
          i: card.id,
          x: (added % 3) * 4,
          y: dash.layouts.reduce((m, l) => Math.max(m, l.y + l.h), 0),
          w: 4,
          h: 6,
          minW: 3,
          minH: 4,
        });
        added++;
      }

      for (const sub of prefs.subscriptions) {
        if (existingMigrated.has(sub.id)) continue;
        const card: DashboardCard = {
          id: uid(),
          queryName: sub.queryName,
          groupId: sub.groupId,
          label: sub.label,
          defaultFilters: sub.defaultFilters,
          autoRun: sub.refreshOnLoad,
          eventLink: { mode: "auto" },
          migratedFromFavoriteId: sub.id,
          createdAt: new Date().toISOString(),
        };
        dash.cards.push(card);
        dash.layouts.push({
          i: card.id,
          x: (added % 3) * 4,
          y: dash.layouts.reduce((m, l) => Math.max(m, l.y + l.h), 0),
          w: 4,
          h: 6,
          minW: 3,
          minH: 4,
        });
        added++;
      }

      dash.updatedAt = new Date().toISOString();
      await this.write(prefs);
      return dash;
    });
  }
  async exportDashboard(
    userId: string,
    dashboardId: string,
  ): Promise<Dashboard | null> {
    const prefs = await this.read(userId);
    return (prefs.dashboards || []).find((d) => d.id === dashboardId) || null;
  }

  async importDashboard(
    userId: string,
    dashboardData: Dashboard,
  ): Promise<Dashboard> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      if (!prefs.dashboards) prefs.dashboards = [];
      // Regenerate IDs to avoid conflicts
      const now = new Date().toISOString();
      const idMap = new Map<string, string>();
      const newCards = dashboardData.cards.map((c) => {
        const newId = uid();
        idMap.set(c.id, newId);
        return { ...c, id: newId, createdAt: now };
      });
      const newLayouts = dashboardData.layouts.map((l) => ({
        ...l,
        i: idMap.get(l.i) || l.i,
      }));
      const newTabs = dashboardData.tabs?.map((t) => ({
        ...t,
        id: uid(),
        cardIds: t.cardIds.map((cid) => idMap.get(cid) || cid),
      }));
      const baseSlug = slugify(dashboardData.name + "-imported");
      let id = baseSlug;
      let suffix = 1;
      while (prefs.dashboards.some((d) => d.id === id)) {
        id = `${baseSlug}-${suffix++}`;
      }
      const imported: Dashboard = {
        id,
        name: dashboardData.name + " (imported)",
        cards: newCards,
        layouts: newLayouts,
        simpleMode: dashboardData.simpleMode,
        globalRefreshSec: dashboardData.globalRefreshSec,
        tabs: newTabs,
        filterDependencies: dashboardData.filterDependencies,
        createdAt: now,
        updatedAt: now,
      };
      prefs.dashboards.push(imported);
      prefs.activeDashboardId = id;
      await this.write(prefs);
      return imported;
    });
  }

  /**
   * Find a dashboard by ID across ALL users. Returns the dashboard, its owner,
   * and the requesting user's permission level ('owner' | 'edit' | 'view' | null).
   */
  async findDashboardAcrossUsers(
    requestingUserId: string,
    dashboardId: string,
  ): Promise<{
    dashboard: Dashboard;
    ownerId: string;
    permission: "owner" | "edit" | "view" | null;
  } | null> {
    try {
      const files = await fs.readdir(PREFS_DIR);
      for (const file of files) {
        if (!file.endsWith(".json") || file.endsWith(".tmp")) continue;
        try {
          const raw = await fs.readFile(path.join(PREFS_DIR, file), "utf-8");
          const prefs: UserPreferences = JSON.parse(raw);
          const dash = (prefs.dashboards || []).find(
            (d) => d.id === dashboardId,
          );
          if (!dash) continue;
          const ownerId = prefs.userId;
          if (ownerId === requestingUserId) {
            return { dashboard: dash, ownerId, permission: "owner" };
          }
          if (dash.sharing?.isPublic) {
            return { dashboard: dash, ownerId, permission: "view" };
          }
          const shareEntry = dash.sharing?.sharedWith?.find(
            (s) => s.userId === requestingUserId,
          );
          if (shareEntry) {
            return {
              dashboard: dash,
              ownerId,
              permission: shareEntry.permission,
            };
          }
          // Dashboard exists but user has no access
          return { dashboard: dash, ownerId, permission: null };
        } catch {
          // skip invalid files
        }
      }
    } catch {
      // preferences dir may not exist
    }
    return null;
  }

  async getSharedDashboards(
    userId: string,
  ): Promise<Array<{ dashboard: Dashboard; ownerId: string }>> {
    // Scan all preference files for dashboards shared with this user
    const results: Array<{ dashboard: Dashboard; ownerId: string }> = [];
    try {
      const files = await fs.readdir(PREFS_DIR);
      for (const file of files) {
        if (!file.endsWith(".json") || file.endsWith(".tmp")) continue;
        try {
          const raw = await fs.readFile(path.join(PREFS_DIR, file), "utf-8");
          const prefs: UserPreferences = JSON.parse(raw);
          if (prefs.userId === userId) continue; // skip own dashboards
          for (const d of prefs.dashboards || []) {
            if (
              d.sharing?.isPublic ||
              d.sharing?.sharedWith?.some((s) => s.userId === userId)
            ) {
              results.push({ dashboard: d, ownerId: prefs.userId });
            }
          }
        } catch {
          // skip invalid files
        }
      }
    } catch {
      // preferences dir may not exist yet
    }
    return results;
  }

  // ── Grid Board View Methods ────────────────────────────────────────

  async listGridBoardViews(
    userId: string,
    queryName?: string,
  ): Promise<GridBoardView[]> {
    const prefs = await this.read(userId);
    const views = prefs.gridBoardViews || [];
    return queryName ? views.filter((v) => v.queryName === queryName) : views;
  }

  async getGridBoardView(
    userId: string,
    viewId: string,
  ): Promise<GridBoardView | null> {
    const prefs = await this.read(userId);
    return (prefs.gridBoardViews || []).find((v) => v.id === viewId) || null;
  }

  async createGridBoardView(
    userId: string,
    input: Omit<GridBoardView, "id" | "createdAt" | "updatedAt">,
  ): Promise<GridBoardView> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      if (!prefs.gridBoardViews) prefs.gridBoardViews = [];
      const now = new Date().toISOString();
      const view: GridBoardView = {
        ...input,
        id: uid(),
        createdAt: now,
        updatedAt: now,
      };
      prefs.gridBoardViews.push(view);
      await this.write(prefs);
      return view;
    });
  }

  async updateGridBoardView(
    userId: string,
    viewId: string,
    partial: Partial<Omit<GridBoardView, "id" | "createdAt">>,
  ): Promise<GridBoardView | null> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      const view = (prefs.gridBoardViews || []).find((v) => v.id === viewId);
      if (!view) return null;
      Object.assign(view, partial, {
        id: viewId,
        updatedAt: new Date().toISOString(),
      });
      await this.write(prefs);
      return view;
    });
  }

  async deleteGridBoardView(userId: string, viewId: string): Promise<boolean> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      const before = (prefs.gridBoardViews || []).length;
      prefs.gridBoardViews = (prefs.gridBoardViews || []).filter(
        (v) => v.id !== viewId,
      );
      if (prefs.gridBoardViews.length === before) return false;
      await this.write(prefs);
      return true;
    });
  }
}

export const preferencesStore = new UserPreferencesStore();
