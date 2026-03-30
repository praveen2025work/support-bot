import * as fs from "fs";
import * as path from "path";
import Fuse from "fuse.js";
import { ApiClient } from "../api-connector/api-client";
import { QueryService } from "../api-connector/query-service";
import type { Query } from "../api-connector/types";

interface CatalogEntry {
  name: string;
  description: string;
  tags: string[];
  owner: string;
  type: string;
  columnCount: number;
  columns: { key: string; label: string; type?: string }[];
  usageCountTotal: number;
  usageCount7d: number;
  trending: boolean;
  filters: string[];
}

interface CatalogDetail extends CatalogEntry {
  relatedQueries: string[];
  lastExecutionTime?: string;
}

interface SignalAggregates {
  [queryName: string]: {
    totalExecutions: number;
    last7d: number;
    [key: string]: unknown;
  };
}

export class CatalogService {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  async listQueries(
    groupId: string,
    apiBaseUrl?: string,
    sources?: string[],
  ): Promise<CatalogEntry[]> {
    const queries = await this.fetchQueries(apiBaseUrl, sources);
    const signals = this.loadSignals(groupId);
    return queries.map((q) => this.toCatalogEntry(q, signals));
  }

  async search(
    groupId: string,
    query: string,
    apiBaseUrl?: string,
    sources?: string[],
  ): Promise<CatalogEntry[]> {
    const entries = await this.listQueries(groupId, apiBaseUrl, sources);
    const searchableEntries = entries.map((e) => ({
      ...e,
      columnNames: e.columns.map((c) => c.label).join(" "),
      filterNames: e.filters.join(" "),
    }));

    const fuse = new Fuse(searchableEntries, {
      keys: [
        "name",
        "description",
        "tags",
        "columnNames",
        "filterNames",
        "owner",
      ],
      threshold: 0.4,
      includeScore: true,
    });

    return fuse.search(query).map((r) => {
      const { columnNames, filterNames, ...entry } = r.item;
      return entry;
    });
  }

  async getQueryDetail(
    groupId: string,
    queryName: string,
    apiBaseUrl?: string,
    sources?: string[],
  ): Promise<CatalogDetail | null> {
    const queries = await this.fetchQueries(apiBaseUrl, sources);
    const q = queries.find((q) => q.name === queryName);
    if (!q) return null;

    const signals = this.loadSignals(groupId);
    const coOccurrence = this.loadCoOccurrence(groupId);
    const entry = this.toCatalogEntry(q, signals);

    const related = coOccurrence[queryName]
      ? Object.keys(coOccurrence[queryName]).sort(
          (a, b) => coOccurrence[queryName][b] - coOccurrence[queryName][a],
        )
      : [];

    return { ...entry, relatedQueries: related };
  }

  private toCatalogEntry(q: Query, signals: SignalAggregates): CatalogEntry {
    const sig = signals[q.name] || { totalExecutions: 0, last7d: 0 };
    const filterNames = (q.filters || []).map((f) =>
      typeof f === "string" ? f : f.key,
    );
    const columnConfig = q.columnConfig;
    const columns: { key: string; label: string; type?: string }[] = [];
    if (columnConfig) {
      for (const col of columnConfig.valueColumns || []) {
        columns.push({ key: col, label: col, type: "number" });
      }
      for (const col of columnConfig.labelColumns || []) {
        columns.push({ key: col, label: col, type: "string" });
      }
      for (const col of columnConfig.dateColumns || []) {
        columns.push({ key: col, label: col, type: "date" });
      }
      for (const col of columnConfig.idColumns || []) {
        columns.push({ key: col, label: col, type: "id" });
      }
    }

    return {
      name: q.name,
      description: q.description || "",
      tags: q.source ? [q.source] : [],
      owner: "",
      type: q.type,
      columnCount: columns.length,
      columns,
      usageCountTotal: sig.totalExecutions,
      usageCount7d: sig.last7d,
      trending: sig.last7d > sig.totalExecutions * 0.3,
      filters: filterNames,
    };
  }

  private async fetchQueries(
    apiBaseUrl?: string,
    sources?: string[],
  ): Promise<Query[]> {
    const apiClient = new ApiClient(apiBaseUrl);
    const queryService = new QueryService(apiClient, sources);
    return queryService.getQueries();
  }

  private loadSignals(groupId: string): SignalAggregates {
    const filePath = path.join(
      this.dataDir,
      "learning",
      groupId,
      "signal-aggregates.json",
    );
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  private loadCoOccurrence(
    groupId: string,
  ): Record<string, Record<string, number>> {
    const filePath = path.join(
      this.dataDir,
      "learning",
      groupId,
      "co-occurrence.json",
    );
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
}
