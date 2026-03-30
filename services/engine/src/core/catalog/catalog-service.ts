import * as fs from "fs";
import * as path from "path";
import Fuse from "fuse.js";

interface QueryColumn {
  key: string;
  label: string;
  type?: string;
}

interface QueryDefinition {
  name: string;
  description?: string;
  tags?: string[];
  owner?: string;
  type: string;
  columns?: QueryColumn[];
  connectorId?: string;
}

interface CatalogEntry {
  name: string;
  description: string;
  tags: string[];
  owner: string;
  type: string;
  columnCount: number;
  columns: QueryColumn[];
  usageCountTotal: number;
  usageCount7d: number;
  trending: boolean;
  connectorId?: string;
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

  listQueries(groupId: string): CatalogEntry[] {
    const queries = this.loadQueries();
    const signals = this.loadSignals(groupId);
    return queries.map((q) => this.toCatalogEntry(q, signals));
  }

  search(groupId: string, query: string): CatalogEntry[] {
    const entries = this.listQueries(groupId);
    const searchableEntries = entries.map((e) => ({
      ...e,
      columnNames: e.columns.map((c) => c.label).join(" "),
    }));

    const fuse = new Fuse(searchableEntries, {
      keys: ["name", "description", "tags", "columnNames", "owner"],
      threshold: 0.4,
      includeScore: true,
    });

    return fuse.search(query).map((r) => {
      const { columnNames, ...entry } = r.item;
      return entry;
    });
  }

  getQueryDetail(groupId: string, queryName: string): CatalogDetail | null {
    const queries = this.loadQueries();
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

  private toCatalogEntry(
    q: QueryDefinition,
    signals: SignalAggregates,
  ): CatalogEntry {
    const sig = signals[q.name] || { totalExecutions: 0, last7d: 0 };
    return {
      name: q.name,
      description: q.description || "",
      tags: q.tags || [],
      owner: q.owner || "",
      type: q.type,
      columnCount: q.columns?.length || 0,
      columns: q.columns || [],
      usageCountTotal: sig.totalExecutions,
      usageCount7d: sig.last7d,
      trending: sig.last7d > sig.totalExecutions * 0.3,
      connectorId: q.connectorId,
    };
  }

  private loadQueries(): QueryDefinition[] {
    const filePath = path.join(this.dataDir, "queries.json");
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
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
