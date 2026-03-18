import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';
import { paths } from '@/lib/env-config';

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
  mode: 'auto' | 'manual' | 'disabled';
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

export interface DashboardSubscription {
  id: string;
  email: string;
  cronExpression: string;
  enabled: boolean;
  createdAt: string;
  lastSentAt?: string;
  nextSendAt?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  cards: DashboardCard[];
  layouts: CardLayout[];
  subscriptions?: DashboardSubscription[];
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
  const safe = userId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  return path.join(PREFS_DIR, `${safe}.json`);
}

function defaultPrefs(userId: string): UserPreferences {
  return { userId, favorites: [], subscriptions: [], recentQueries: [], dashboards: [], updatedAt: new Date().toISOString() };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `dashboard-${Date.now()}`;
}

export class UserPreferencesStore {
  async read(userId: string): Promise<UserPreferences> {
    try {
      const raw = await fs.readFile(prefsPath(userId), 'utf-8');
      return JSON.parse(raw);
    } catch {
      return defaultPrefs(userId);
    }
  }

  private async write(prefs: UserPreferences): Promise<void> {
    await fs.mkdir(PREFS_DIR, { recursive: true });
    prefs.updatedAt = new Date().toISOString();
    await fs.writeFile(prefsPath(prefs.userId), JSON.stringify(prefs, null, 2), 'utf-8');
  }

  async addFavorite(userId: string, item: Omit<FavoriteItem, 'id' | 'createdAt'>): Promise<FavoriteItem> {
    const prefs = await this.read(userId);
    const fav: FavoriteItem = { ...item, id: uid(), createdAt: new Date().toISOString() };
    prefs.favorites.push(fav);
    await this.write(prefs);
    return fav;
  }

  async removeFavorite(userId: string, favoriteId: string): Promise<boolean> {
    const prefs = await this.read(userId);
    const before = prefs.favorites.length;
    prefs.favorites = prefs.favorites.filter((f) => f.id !== favoriteId);
    if (prefs.favorites.length === before) return false;
    await this.write(prefs);
    return true;
  }

  async addSubscription(userId: string, item: Omit<SubscriptionItem, 'id' | 'createdAt'>): Promise<SubscriptionItem> {
    const prefs = await this.read(userId);
    const sub: SubscriptionItem = { ...item, id: uid(), createdAt: new Date().toISOString() };
    prefs.subscriptions.push(sub);
    await this.write(prefs);
    return sub;
  }

  async removeSubscription(userId: string, subscriptionId: string): Promise<boolean> {
    const prefs = await this.read(userId);
    const before = prefs.subscriptions.length;
    prefs.subscriptions = prefs.subscriptions.filter((s) => s.id !== subscriptionId);
    if (prefs.subscriptions.length === before) return false;
    await this.write(prefs);
    return true;
  }

  async appendRecent(userId: string, recent: RecentQuery): Promise<void> {
    try {
      const prefs = await this.read(userId);
      prefs.recentQueries.unshift(recent);
      if (prefs.recentQueries.length > MAX_RECENTS) {
        prefs.recentQueries = prefs.recentQueries.slice(0, MAX_RECENTS);
      }
      await this.write(prefs);
    } catch (err) {
      logger.warn({ err, userId }, 'Failed to append recent query');
    }
  }

  async clearRecents(userId: string): Promise<void> {
    const prefs = await this.read(userId);
    prefs.recentQueries = [];
    await this.write(prefs);
  }

  async update(userId: string, partial: Partial<Pick<UserPreferences, 'favorites' | 'subscriptions'>>): Promise<UserPreferences> {
    const prefs = await this.read(userId);
    if (partial.favorites) prefs.favorites = partial.favorites;
    if (partial.subscriptions) prefs.subscriptions = partial.subscriptions;
    await this.write(prefs);
    return prefs;
  }

  // ── Dashboard Methods ──────────────────────────────────────────────

  async listDashboards(userId: string): Promise<Dashboard[]> {
    const prefs = await this.read(userId);
    return prefs.dashboards || [];
  }

  async getDashboard(userId: string, dashboardId: string): Promise<Dashboard | null> {
    const prefs = await this.read(userId);
    return (prefs.dashboards || []).find((d) => d.id === dashboardId) || null;
  }

  async createDashboard(userId: string, input: { name: string; cards?: DashboardCard[]; layouts?: CardLayout[] }): Promise<Dashboard> {
    const prefs = await this.read(userId);
    if (!prefs.dashboards) prefs.dashboards = [];
    const baseSlug = slugify(input.name);
    // Ensure unique ID
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
  }

  async updateDashboard(userId: string, dashboardId: string, partial: Partial<Pick<Dashboard, 'name' | 'cards' | 'layouts'>>): Promise<Dashboard | null> {
    const prefs = await this.read(userId);
    const dash = (prefs.dashboards || []).find((d) => d.id === dashboardId);
    if (!dash) return null;
    if (partial.name !== undefined) dash.name = partial.name;
    if (partial.cards !== undefined) dash.cards = partial.cards;
    if (partial.layouts !== undefined) dash.layouts = partial.layouts;
    dash.updatedAt = new Date().toISOString();
    await this.write(prefs);
    return dash;
  }

  async deleteDashboard(userId: string, dashboardId: string): Promise<boolean> {
    const prefs = await this.read(userId);
    const before = (prefs.dashboards || []).length;
    prefs.dashboards = (prefs.dashboards || []).filter((d) => d.id !== dashboardId);
    if (prefs.dashboards.length === before) return false;
    if (prefs.activeDashboardId === dashboardId) {
      prefs.activeDashboardId = prefs.dashboards[0]?.id;
    }
    await this.write(prefs);
    return true;
  }

  async updateDashboardLayouts(userId: string, dashboardId: string, layouts: CardLayout[]): Promise<Dashboard | null> {
    return this.updateDashboard(userId, dashboardId, { layouts });
  }

  async addCardToDashboard(userId: string, dashboardId: string, card: Omit<DashboardCard, 'id' | 'createdAt'>): Promise<DashboardCard | null> {
    const prefs = await this.read(userId);
    const dash = (prefs.dashboards || []).find((d) => d.id === dashboardId);
    if (!dash) return null;
    const newCard: DashboardCard = { ...card, id: uid(), createdAt: new Date().toISOString() };
    dash.cards.push(newCard);
    // Auto-generate layout position: next available slot in 3-col grid
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
  }

  async removeCardFromDashboard(userId: string, dashboardId: string, cardId: string): Promise<boolean> {
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
  }

  async updateCard(userId: string, dashboardId: string, cardId: string, partial: Partial<DashboardCard>): Promise<DashboardCard | null> {
    const prefs = await this.read(userId);
    const dash = (prefs.dashboards || []).find((d) => d.id === dashboardId);
    if (!dash) return null;
    const card = dash.cards.find((c) => c.id === cardId);
    if (!card) return null;
    Object.assign(card, partial, { id: cardId }); // prevent id overwrite
    dash.updatedAt = new Date().toISOString();
    await this.write(prefs);
    return card;
  }

  async setActiveDashboard(userId: string, dashboardId: string): Promise<void> {
    const prefs = await this.read(userId);
    prefs.activeDashboardId = dashboardId;
    await this.write(prefs);
  }

  async migrateFavoritesToDashboard(userId: string, dashboardId: string): Promise<Dashboard | null> {
    const prefs = await this.read(userId);
    const dash = (prefs.dashboards || []).find((d) => d.id === dashboardId);
    if (!dash) return null;

    const existingMigrated = new Set(dash.cards.filter((c) => c.migratedFromFavoriteId).map((c) => c.migratedFromFavoriteId));
    let added = 0;

    // Migrate favorites
    for (const fav of prefs.favorites) {
      if (existingMigrated.has(fav.id)) continue;
      const card: DashboardCard = {
        id: uid(),
        queryName: fav.queryName,
        groupId: fav.groupId,
        label: fav.label,
        defaultFilters: fav.defaultFilters,
        autoRun: false,
        eventLink: { mode: 'auto' },
        migratedFromFavoriteId: fav.id,
        createdAt: new Date().toISOString(),
      };
      dash.cards.push(card);
      dash.layouts.push({
        i: card.id,
        x: (added % 3) * 4,
        y: dash.layouts.reduce((m, l) => Math.max(m, l.y + l.h), 0),
        w: 4, h: 6, minW: 3, minH: 4,
      });
      added++;
    }

    // Migrate subscriptions
    for (const sub of prefs.subscriptions) {
      if (existingMigrated.has(sub.id)) continue;
      const card: DashboardCard = {
        id: uid(),
        queryName: sub.queryName,
        groupId: sub.groupId,
        label: sub.label,
        defaultFilters: sub.defaultFilters,
        autoRun: sub.refreshOnLoad,
        eventLink: { mode: 'auto' },
        migratedFromFavoriteId: sub.id,
        createdAt: new Date().toISOString(),
      };
      dash.cards.push(card);
      dash.layouts.push({
        i: card.id,
        x: (added % 3) * 4,
        y: dash.layouts.reduce((m, l) => Math.max(m, l.y + l.h), 0),
        w: 4, h: 6, minW: 3, minH: 4,
      });
      added++;
    }

    dash.updatedAt = new Date().toISOString();
    await this.write(prefs);
    return dash;
  }

  // ── Dashboard Email Subscriptions ───────────────────────────────────

  async addDashboardSubscription(userId: string, dashboardId: string, data: { email: string; cronExpression: string }): Promise<DashboardSubscription | null> {
    const prefs = await this.read(userId);
    const dash = (prefs.dashboards || []).find((d) => d.id === dashboardId);
    if (!dash) return null;
    if (!dash.subscriptions) dash.subscriptions = [];
    const sub: DashboardSubscription = {
      id: uid(),
      email: data.email,
      cronExpression: data.cronExpression,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    dash.subscriptions.push(sub);
    dash.updatedAt = new Date().toISOString();
    await this.write(prefs);
    return sub;
  }

  async removeDashboardSubscription(userId: string, dashboardId: string, subId: string): Promise<boolean> {
    const prefs = await this.read(userId);
    const dash = (prefs.dashboards || []).find((d) => d.id === dashboardId);
    if (!dash || !dash.subscriptions) return false;
    const idx = dash.subscriptions.findIndex((s) => s.id === subId);
    if (idx === -1) return false;
    dash.subscriptions.splice(idx, 1);
    dash.updatedAt = new Date().toISOString();
    await this.write(prefs);
    return true;
  }

  async updateDashboardSubscription(userId: string, dashboardId: string, subId: string, updates: Partial<DashboardSubscription>): Promise<DashboardSubscription | null> {
    const prefs = await this.read(userId);
    const dash = (prefs.dashboards || []).find((d) => d.id === dashboardId);
    if (!dash || !dash.subscriptions) return null;
    const sub = dash.subscriptions.find((s) => s.id === subId);
    if (!sub) return null;
    if (updates.email !== undefined) sub.email = updates.email;
    if (updates.cronExpression !== undefined) sub.cronExpression = updates.cronExpression;
    if (updates.enabled !== undefined) sub.enabled = updates.enabled;
    if (updates.lastSentAt !== undefined) sub.lastSentAt = updates.lastSentAt;
    if (updates.nextSendAt !== undefined) sub.nextSendAt = updates.nextSendAt;
    dash.updatedAt = new Date().toISOString();
    await this.write(prefs);
    return sub;
  }

  /** Get all active subscriptions across all users (for the email scheduler) */
  async getAllActiveSubscriptions(): Promise<Array<{ userId: string; dashboardId: string; dashboardName: string; subscription: DashboardSubscription; cards: DashboardCard[] }>> {
    const result: Array<{ userId: string; dashboardId: string; dashboardName: string; subscription: DashboardSubscription; cards: DashboardCard[] }> = [];
    try {
      await fs.mkdir(PREFS_DIR, { recursive: true });
      const files = await fs.readdir(PREFS_DIR);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const raw = await fs.readFile(path.join(PREFS_DIR, file), 'utf-8');
          const prefs: UserPreferences = JSON.parse(raw);
          for (const dash of prefs.dashboards || []) {
            for (const sub of dash.subscriptions || []) {
              if (sub.enabled) {
                result.push({ userId: prefs.userId, dashboardId: dash.id, dashboardName: dash.name, subscription: sub, cards: dash.cards });
              }
            }
          }
        } catch { /* skip corrupt files */ }
      }
    } catch { /* dir doesn't exist yet */ }
    return result;
  }
}

export const preferencesStore = new UserPreferencesStore();
