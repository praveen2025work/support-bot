"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  DataSource,
  DataQueryRequest,
  DataQueryResponse,
  SchemaResponse,
  ColumnSchema,
} from "./types";

const DEFAULT_PAGE_SIZE = 50;
const MAX_FILTER_DISTINCT_VALUES = 100;

export function useDataExplorer(groupId = "default") {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [queryResult, setQueryResult] = useState<DataQueryResponse | null>(
    null,
  );
  const [allRows, setAllRows] = useState<Record<string, string | number>[]>([]);
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Query parameters
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [groupByCol, setGroupByCol] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<
    Array<{
      columnName: string;
      severity: "info" | "warning" | "critical";
      message: string;
      zScore?: number;
      direction?: "spike" | "drop";
      percentChange?: number;
    }>
  >([]);

  // Load sources
  useEffect(() => {
    async function loadSources() {
      try {
        const res = await fetch(
          `/api/data/sources?groupId=${encodeURIComponent(groupId)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSources(data.sources ?? []);
      } catch (err) {
        setError(`Failed to load sources: ${err}`);
      }
    }
    loadSources();
  }, [groupId]);

  // Load schema when source changes
  useEffect(() => {
    if (!selectedSource) {
      setSchema(null);
      return;
    }
    async function loadSchema() {
      setSchemaLoading(true);
      try {
        const res = await fetch(
          `/api/data/schema/${encodeURIComponent(selectedSource!)}?groupId=${encodeURIComponent(groupId)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSchema(data);
      } catch (err) {
        setError(`Failed to load schema: ${err}`);
      } finally {
        setSchemaLoading(false);
      }
    }
    loadSchema();
    // Reset state
    setFilters({});
    setSortCol(null);
    setPage(1);
    setSearch("");
    setGroupByCol(null);
  }, [selectedSource, groupId]);

  // Execute query
  const executeQuery = useCallback(async () => {
    if (!selectedSource) return;
    setLoading(true);
    setError(null);
    try {
      const body: DataQueryRequest = {
        queryName: selectedSource,
        groupId,
        page,
        pageSize,
      };

      // Add non-empty filters
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v),
      );
      if (Object.keys(activeFilters).length > 0) body.filters = activeFilters;

      if (sortCol) body.sort = { column: sortCol, direction: sortDir };
      if (search.trim()) body.search = search.trim();
      if (groupByCol) body.groupBy = groupByCol;

      const res = await fetch("/api/data/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DataQueryResponse = await res.json();
      setQueryResult(data);

      // Use the already-fetched page rows for charts/KPIs when dataset is small,
      // otherwise make a capped secondary request for aggregation data
      if (page === 1) {
        const totalRows = data.totalRows ?? 0;
        if (totalRows <= (body.pageSize ?? 100)) {
          // All data already fetched in the paginated request
          setAllRows(data.rows ?? []);
        } else {
          // Fetch up to 1000 rows (backend max) for client-side aggregation
          const allBody = { ...body, page: 1, pageSize: 1000 };
          const allRes = await fetch("/api/data/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(allBody),
          });
          if (allRes.ok) {
            const allData = await allRes.json();
            setAllRows(allData.rows ?? []);
          }
        }
      }
      // Check anomalies (fire-and-forget, don't block main query)
      if (page === 1) {
        fetch("/api/data/anomalies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            queryName: selectedSource,
            groupId,
            filters:
              Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
            search: search.trim() || undefined,
          }),
        })
          .then((r) => r.json())
          .then((d) => setAnomalies(d.anomalies ?? []))
          .catch(() => setAnomalies([]));
      }
    } catch (err) {
      setError(`Query failed: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [
    selectedSource,
    groupId,
    filters,
    sortCol,
    sortDir,
    page,
    pageSize,
    search,
    groupByCol,
  ]);

  // Auto-execute when source/filters/sort/page change
  useEffect(() => {
    if (selectedSource) executeQuery();
  }, [selectedSource, executeQuery]);

  // Derived: column schemas
  const columnSchemas: ColumnSchema[] = useMemo(() => {
    return queryResult?.schema ?? [];
  }, [queryResult]);

  // Derived: string columns with low cardinality (for dropdowns)
  const filterableColumns = useMemo(() => {
    if (!schema) return [];
    return schema.schema.filter(
      (c) =>
        (c.type === "string" || c.type === "id") &&
        c.distinctCount > 0 &&
        c.distinctCount <= MAX_FILTER_DISTINCT_VALUES,
    );
  }, [schema]);

  // Derived: numeric columns (for KPIs)
  const numericColumns = useMemo(() => {
    return columnSchemas.filter(
      (c) =>
        c.type === "numeric" || c.type === "integer" || c.type === "decimal",
    );
  }, [columnSchemas]);

  return {
    // Sources
    sources,
    selectedSource,
    setSelectedSource,

    // Schema
    schema,
    schemaLoading,
    columnSchemas,
    filterableColumns,
    numericColumns,

    // Query
    queryResult,
    allRows,
    loading,
    error,
    executeQuery,

    // Params
    filters,
    setFilters,
    setFilter: (key: string, value: string) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    sortCol,
    setSortCol,
    sortDir,
    setSortDir,
    page,
    setPage,
    pageSize,
    search,
    setSearch,
    groupByCol,
    setGroupByCol,
    anomalies,
  };
}
