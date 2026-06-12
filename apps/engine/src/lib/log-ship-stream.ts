import { Writable } from "stream";

export interface LogShipOptions {
  /** HTTP endpoint that receives the NDJSON log batch. */
  url: string;
  /** Extra HTTP headers (e.g. an Authorization token). */
  headers?: Record<string, string>;
  /** Flush once this many lines are buffered (default 100). */
  batchSize?: number;
  /** Flush at least this often while lines trickle in (default 5000ms). */
  intervalMs?: number;
}

/**
 * In-process pino destination that batches NDJSON log lines and POSTs them to
 * an external HTTP sink (Loki/Vector/Logstash/Datadog HTTP intake/etc.).
 *
 * Deliberately in-process rather than a worker-thread transport: esbuild
 * bundles the engine into a single file, so a transport loaded by path would
 * not exist in dist/. An in-process Writable bundles normally and resolves
 * identically under tsx (dev) and dist (prod).
 *
 * A failing or unreachable sink is swallowed (logged once to the console) —
 * shipping must never throw, block, or crash the application.
 */
export function createLogShipStream(opts: LogShipOptions): Writable {
  const { url } = opts;
  const headers: Record<string, string> = {
    "content-type": "application/x-ndjson",
    ...(opts.headers ?? {}),
  };
  const batchSize = opts.batchSize && opts.batchSize > 0 ? opts.batchSize : 100;
  const intervalMs =
    opts.intervalMs && opts.intervalMs > 0 ? opts.intervalMs : 5000;

  let buffer: string[] = [];
  let timer: NodeJS.Timeout | null = null;

  function clearTimer(): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  async function flush(): Promise<void> {
    clearTimer();
    if (buffer.length === 0) return;
    const body = buffer.join("");
    buffer = [];
    try {
      await fetch(url, { method: "POST", headers, body });
    } catch (err) {
      console.warn(
        "log-ship: failed to POST logs:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  function scheduleFlush(): void {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, intervalMs);
    // Don't keep the event loop alive just to flush logs.
    if (typeof timer.unref === "function") timer.unref();
  }

  return new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      buffer.push(chunk.toString());
      if (buffer.length >= batchSize) {
        void flush();
      } else {
        scheduleFlush();
      }
      callback();
    },
    final(callback) {
      void flush().finally(() => callback());
    },
  });
}
