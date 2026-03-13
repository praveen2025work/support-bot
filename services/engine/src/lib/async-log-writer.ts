import { promises as fs } from 'fs';
import { dirname } from 'path';
import { logger } from './logger';

/**
 * High-performance async log writer with buffering, batching, and backpressure.
 *
 * Instead of synchronous appendFileSync on every request, this buffers entries
 * in memory and flushes them in batches. This prevents the event loop from
 * blocking on I/O during high-throughput chat requests (1500+ req/min).
 *
 * Features:
 * - Batches writes (default: every 500ms or 50 entries, whichever comes first)
 * - Backpressure: drops oldest entries if buffer exceeds MAX_BUFFER_SIZE
 * - Graceful shutdown: flushes remaining entries on process exit
 * - Non-blocking: write failures are logged but never throw to callers
 */
export class AsyncLogWriter {
  private buffer: string[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private dirEnsured = false;

  constructor(
    private filePath: string,
    private options: {
      flushIntervalMs?: number;
      maxBatchSize?: number;
      maxBufferSize?: number;
    } = {}
  ) {
    const flushIntervalMs = options.flushIntervalMs ?? 500;
    this.flushTimer = setInterval(() => this.flush(), flushIntervalMs);
    this.flushTimer.unref(); // Don't keep process alive just for logging

    // Flush on shutdown
    const onExit = () => {
      this.flushSync();
    };
    process.on('beforeExit', onExit);
    process.on('SIGTERM', onExit);
    process.on('SIGINT', onExit);
  }

  private get maxBatchSize(): number {
    return this.options.maxBatchSize ?? 50;
  }

  private get maxBufferSize(): number {
    return this.options.maxBufferSize ?? 5000;
  }

  /** Append an entry to the buffer. Never blocks or throws. */
  append(line: string): void {
    // Backpressure: drop oldest if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      this.buffer.shift();
    }
    this.buffer.push(line);

    // Flush immediately if batch is full
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  /** Async flush — writes all buffered entries to disk. */
  async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;
    this.flushing = true;

    const batch = this.buffer.splice(0);
    try {
      if (!this.dirEnsured) {
        await fs.mkdir(dirname(this.filePath), { recursive: true });
        this.dirEnsured = true;
      }
      await fs.appendFile(this.filePath, batch.join('\n') + '\n', 'utf-8');
    } catch (err) {
      logger.error({ err, filePath: this.filePath, droppedLines: batch.length }, 'AsyncLogWriter flush failed');
      // Don't re-add to buffer — accept data loss over memory pressure
    } finally {
      this.flushing = false;
    }
  }

  /** Synchronous best-effort flush for process exit. */
  private flushSync(): void {
    if (this.buffer.length === 0) return;
    try {
      const { writeFileSync, mkdirSync, existsSync } = require('fs');
      if (!existsSync(dirname(this.filePath))) {
        mkdirSync(dirname(this.filePath), { recursive: true });
      }
      writeFileSync(this.filePath, this.buffer.join('\n') + '\n', { flag: 'a' });
      this.buffer.length = 0;
    } catch {
      // Best effort — process is exiting
    }
  }

  /** Returns current buffer size (for monitoring). */
  get pendingCount(): number {
    return this.buffer.length;
  }

  /** Stop the flush timer and flush remaining entries. */
  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}
