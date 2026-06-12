import { parentPort } from 'worker_threads';

/** Message shape received from the main thread. */
interface TaskMessage {
  taskFn: string;
  data: unknown;
}

/**
 * Generic worker entry point.
 *
 * Listens for messages containing a module-qualified function name
 * (e.g. "@/core/ml/kmeans.kMeans") and the data to pass to it.
 * Dynamically imports the module, invokes the function, and posts
 * the result back to the parent thread.
 */
if (parentPort) {
  parentPort.on('message', async (message: TaskMessage) => {
    try {
      const { taskFn, data } = message;

      // Parse "modulePath.functionName" format
      const lastDot = taskFn.lastIndexOf('.');
      if (lastDot === -1) {
        throw new Error(`Invalid taskFn format: "${taskFn}". Expected "module.function".`);
      }

      const modulePath = taskFn.slice(0, lastDot);
      const functionName = taskFn.slice(lastDot + 1);

      // Dynamically require the module
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(modulePath);

      if (typeof mod[functionName] !== 'function') {
        throw new Error(`Function "${functionName}" not found in module "${modulePath}".`);
      }

      const result = await mod[functionName](data);

      parentPort!.postMessage({ success: true, data: result });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      parentPort!.postMessage({ success: false, error: errorMessage });
    }
  });
}
