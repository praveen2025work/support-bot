import { Worker } from 'worker_threads';
import * as os from 'os';
import * as path from 'path';

/** Queued task waiting for a free worker. */
interface QueuedTask {
  taskFn: string;
  data: unknown;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

/** Managed worker with busy state tracking. */
interface ManagedWorker {
  worker: Worker;
  busy: boolean;
}

const WORKER_SCRIPT = path.resolve(__dirname, 'workers', 'heavy-task-worker.js');
const POOL_SIZE = Math.min(Math.max(1, os.cpus().length - 1), 4);
const TASK_TIMEOUT_MS = 30_000;

let pool: ManagedWorker[] = [];
let initialized = false;
const taskQueue: QueuedTask[] = [];

/**
 * Initialize the worker pool lazily on first use.
 */
function ensurePool(): void {
  if (initialized) return;
  initialized = true;

  for (let i = 0; i < POOL_SIZE; i++) {
    const worker = new Worker(WORKER_SCRIPT);
    pool.push({ worker, busy: false });
  }
}

/**
 * Find an idle worker from the pool.
 */
function getIdleWorker(): ManagedWorker | null {
  return pool.find((w) => !w.busy) ?? null;
}

/**
 * Process queued tasks if workers are available.
 */
function drainQueue(): void {
  while (taskQueue.length > 0) {
    const idle = getIdleWorker();
    if (!idle) break;

    const task = taskQueue.shift()!;
    dispatch(idle, task.taskFn, task.data)
      .then(task.resolve)
      .catch(task.reject);
  }
}

/**
 * Dispatch a task to a specific worker.
 */
function dispatch<T>(
  managed: ManagedWorker,
  taskFn: string,
  data: unknown
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    managed.busy = true;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Worker task timed out after ${TASK_TIMEOUT_MS}ms`));
    }, TASK_TIMEOUT_MS);

    function cleanup(): void {
      clearTimeout(timeout);
      managed.worker.removeListener('message', onMessage);
      managed.worker.removeListener('error', onError);
      managed.busy = false;
      drainQueue();
    }

    function onMessage(result: { success: boolean; data?: T; error?: string }): void {
      cleanup();
      if (result.success) {
        resolve(result.data as T);
      } else {
        reject(new Error(result.error ?? 'Worker task failed'));
      }
    }

    function onError(err: Error): void {
      cleanup();
      reject(err);
    }

    managed.worker.once('message', onMessage);
    managed.worker.once('error', onError);
    managed.worker.postMessage({ taskFn, data });
  });
}

/**
 * Run a function in a worker thread from the pool.
 *
 * The pool is lazily initialized with `min(cpus - 1, 4)` workers.
 * Tasks are queued if all workers are busy. Each task has a 30-second timeout.
 *
 * @param taskFn - The module-qualified function name to execute (e.g. "@/core/ml/kmeans.kMeans").
 * @param data   - Data to pass to the worker function.
 * @returns The result of the worker function.
 */
export function runInWorker<T>(taskFn: string, data: unknown): Promise<T> {
  ensurePool();

  const idle = getIdleWorker();
  if (idle) {
    return dispatch<T>(idle, taskFn, data);
  }

  // Queue the task
  return new Promise<T>((resolve, reject) => {
    taskQueue.push({
      taskFn,
      data,
      resolve: resolve as (value: unknown) => void,
      reject,
    });
  });
}

/**
 * Shut down all workers in the pool. Call on process exit for clean shutdown.
 */
export async function shutdownWorkerPool(): Promise<void> {
  const terminations = pool.map((m) => m.worker.terminate());
  await Promise.all(terminations);
  pool = [];
  initialized = false;
}
