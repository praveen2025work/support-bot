/**
 * In-process Prometheus-compatible metrics registry.
 *
 * Hand-rolled because we don't want to drag `prom-client` (and its
 * transitive deps) into the engine just to emit a handful of
 * counters. The Prom text format is small enough to render directly.
 *
 * Patterns:
 *   - Counter: monotonically increasing total, queried per labelset
 *   - Histogram: bucketed observations (simplified — we emit
 *     summary-style p50/p95/p99 + sum + count rather than full
 *     bucket arrays, since callers mostly want latency dashboards)
 *
 * Scrape model: any GET /api/metrics renders the current snapshot.
 * No retention — Prometheus / your scraper holds history. The
 * process MUST NOT block on metric updates (every chat request
 * increments counters), so all updates are O(1) Map writes.
 */

type LabelSet = Readonly<Record<string, string>>;

interface CounterEntry {
  labels: LabelSet;
  value: number;
}

interface HistogramSeries {
  labels: LabelSet;
  count: number;
  sum: number;
  /** Up to N most-recent observations for percentile calc */
  recent: number[];
}

const HISTOGRAM_WINDOW = 1024;

const counters = new Map<string, CounterEntry[]>();
const histograms = new Map<string, HistogramSeries[]>();
// Snapshot metrics — point-in-time values (e.g. cache size).
// Provider returns the current number on every scrape.
const gauges = new Map<string, () => number>();

function serializeLabels(labels: LabelSet): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return "{}";
  return (
    "{" + keys.map((k) => `${k}="${escapeLabel(labels[k])}"`).join(",") + "}"
  );
}

function escapeLabel(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function findOrCreate<T extends { labels: LabelSet }>(
  list: T[],
  labels: LabelSet,
  factory: () => T,
): T {
  const key = serializeLabels(labels);
  for (const entry of list) {
    if (serializeLabels(entry.labels) === key) return entry;
  }
  const created = factory();
  list.push(created);
  return created;
}

export function incCounter(name: string, labels: LabelSet = {}, n = 1): void {
  let list = counters.get(name);
  if (!list) {
    list = [];
    counters.set(name, list);
  }
  const entry = findOrCreate(list, labels, () => ({ labels, value: 0 }));
  entry.value += n;
}

export function observeHistogram(
  name: string,
  value: number,
  labels: LabelSet = {},
): void {
  let list = histograms.get(name);
  if (!list) {
    list = [];
    histograms.set(name, list);
  }
  const entry = findOrCreate(list, labels, () => ({
    labels,
    count: 0,
    sum: 0,
    recent: [],
  }));
  entry.count += 1;
  entry.sum += value;
  entry.recent.push(value);
  if (entry.recent.length > HISTOGRAM_WINDOW) {
    entry.recent.shift();
  }
}

export function registerGauge(name: string, provider: () => number): void {
  gauges.set(name, provider);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

/**
 * Render the registry as Prometheus text exposition format
 * (https://prometheus.io/docs/instrumenting/exposition_formats/).
 * Compatible with most scrapers: Prometheus, VictoriaMetrics,
 * Grafana Alloy, Datadog OpenMetrics integrations.
 */
export function renderPrometheus(): string {
  const lines: string[] = [];

  for (const [name, list] of counters) {
    lines.push(`# HELP ${name} counter`);
    lines.push(`# TYPE ${name} counter`);
    for (const entry of list) {
      lines.push(`${name}${serializeLabels(entry.labels)} ${entry.value}`);
    }
  }

  for (const [name, list] of histograms) {
    lines.push(`# HELP ${name} histogram (window=${HISTOGRAM_WINDOW})`);
    lines.push(`# TYPE ${name} summary`);
    for (const entry of list) {
      const labels = serializeLabels(entry.labels);
      const sorted = [...entry.recent].sort((a, b) => a - b);
      lines.push(`${name}_sum${labels} ${entry.sum.toFixed(3)}`);
      lines.push(`${name}_count${labels} ${entry.count}`);
      lines.push(
        `${name}${insertQuantile(labels, "0.5")} ${percentile(sorted, 0.5).toFixed(3)}`,
      );
      lines.push(
        `${name}${insertQuantile(labels, "0.95")} ${percentile(sorted, 0.95).toFixed(3)}`,
      );
      lines.push(
        `${name}${insertQuantile(labels, "0.99")} ${percentile(sorted, 0.99).toFixed(3)}`,
      );
    }
  }

  for (const [name, provider] of gauges) {
    let value: number;
    try {
      value = provider();
    } catch {
      continue;
    }
    lines.push(`# HELP ${name} gauge`);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name} ${value}`);
  }

  // Process-level housekeeping — useful for any deployment.
  const mem = process.memoryUsage();
  lines.push(`# HELP process_resident_memory_bytes Resident Set Size`);
  lines.push(`# TYPE process_resident_memory_bytes gauge`);
  lines.push(`process_resident_memory_bytes ${mem.rss}`);
  lines.push(`# HELP process_heap_used_bytes V8 heap used`);
  lines.push(`# TYPE process_heap_used_bytes gauge`);
  lines.push(`process_heap_used_bytes ${mem.heapUsed}`);
  lines.push(`# HELP process_uptime_seconds Process uptime`);
  lines.push(`# TYPE process_uptime_seconds gauge`);
  lines.push(`process_uptime_seconds ${process.uptime().toFixed(2)}`);

  return lines.join("\n") + "\n";
}

function insertQuantile(labels: string, q: string): string {
  // Insert quantile="..." into the labelset. The labelset is either
  // "{}" (no other labels) or "{k="v",...}".
  if (labels === "{}") return `{quantile="${q}"}`;
  return labels.replace(/\}$/, `,quantile="${q}"}`);
}

/** Reset everything — only used in tests, not exposed on the wire. */
export function resetMetrics(): void {
  counters.clear();
  histograms.clear();
  gauges.clear();
}
