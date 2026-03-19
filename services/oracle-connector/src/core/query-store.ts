/**
 * Query Store — CRUD for saved SQL query definitions.
 * Persists to a JSON file on disk.
 */

import { promises as fs } from "fs";
import { paths } from "@/lib/env-config";
import { logger } from "@/lib/logger";
import type { SavedQuery } from "./types";

class QueryStore {
  private queries = new Map<string, SavedQuery>();
  private loaded = false;

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(paths.queries.config, "utf-8");
      const list = JSON.parse(raw) as SavedQuery[];
      this.queries.clear();
      for (const q of list) this.queries.set(q.id, q);
    } catch {
      // File doesn't exist yet — start fresh
    }
    this.loaded = true;
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.load();
  }

  private async save(): Promise<void> {
    await fs.mkdir(paths.queries.dir, { recursive: true });
    const list = Array.from(this.queries.values());
    await fs.writeFile(
      paths.queries.config,
      JSON.stringify(list, null, 2),
      "utf-8",
    );
  }

  async list(connectorId?: string): Promise<SavedQuery[]> {
    await this.ensureLoaded();
    const all = Array.from(this.queries.values());
    if (connectorId) return all.filter((q) => q.connectorId === connectorId);
    return all;
  }

  async get(queryId: string): Promise<SavedQuery | undefined> {
    await this.ensureLoaded();
    return this.queries.get(queryId);
  }

  async create(query: SavedQuery): Promise<SavedQuery> {
    await this.ensureLoaded();
    if (this.queries.has(query.id)) {
      throw new Error(`Query "${query.id}" already exists`);
    }
    this.queries.set(query.id, query);
    await this.save();
    logger.info({ queryId: query.id, name: query.name }, "Query created");
    return query;
  }

  async update(
    queryId: string,
    updates: Partial<SavedQuery>,
  ): Promise<SavedQuery> {
    await this.ensureLoaded();
    const existing = this.queries.get(queryId);
    if (!existing) throw new Error(`Query "${queryId}" not found`);
    const updated = {
      ...existing,
      ...updates,
      id: queryId,
      updatedAt: new Date().toISOString(),
    };
    this.queries.set(queryId, updated);
    await this.save();
    logger.info({ queryId }, "Query updated");
    return updated;
  }

  async delete(queryId: string): Promise<void> {
    await this.ensureLoaded();
    if (!this.queries.has(queryId))
      throw new Error(`Query "${queryId}" not found`);
    this.queries.delete(queryId);
    await this.save();
    logger.info({ queryId }, "Query deleted");
  }
}

export const queryStore = new QueryStore();
