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

export interface UserPreferences {
  userId: string;
  favorites: FavoriteItem[];
  subscriptions: SubscriptionItem[];
  recentQueries: RecentQuery[];
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
  return { userId, favorites: [], subscriptions: [], recentQueries: [], updatedAt: new Date().toISOString() };
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
}

export const preferencesStore = new UserPreferencesStore();
