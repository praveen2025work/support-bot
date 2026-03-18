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
  migratedFromFavoriteId?: string;
  createdAt: string;
}

export interface Dashboard {
  id: string;
  name: string;
  cards: DashboardCard[];
  layouts: CardLayout[];
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
    partial: Partial<Pick<Dashboard, "name" | "cards" | "layouts">>,
  ): Promise<Dashboard | null> {
    return this.withLock(userId, async () => {
      const prefs = await this.read(userId);
      const dash = (prefs.dashboards || []).find((d) => d.id === dashboardId);
      if (!dash) return null;
      if (partial.name !== undefined) dash.name = partial.name;
      if (partial.cards !== undefined) dash.cards = partial.cards;
      if (partial.layouts !== undefined) dash.layouts = partial.layouts;
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
}

export const preferencesStore = new UserPreferencesStore();
