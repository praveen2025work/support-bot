import { promises as fs } from "fs";
import { join } from "path";
import { paths } from "@/lib/env-config";

function candidateTrainingPaths(parts: string[]): string[] {
  const configuredPath = join(paths.training.root, ...parts);
  // Fallback to the app's own baked training dir (<cwd>/src/training) when the
  // configured TRAINING_DIR volume hasn't been seeded yet. Relative to the
  // engine's working dir (apps/engine in dev, /app in the image).
  const serviceSourcePath = join(process.cwd(), "src", "training", ...parts);

  return configuredPath === serviceSourcePath
    ? [configuredPath]
    : [configuredPath, serviceSourcePath];
}

export async function readTrainingJson<T>(...parts: string[]): Promise<T> {
  let lastError: unknown;
  for (const filePath of candidateTrainingPaths(parts)) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw) as T;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
      lastError = error;
    }
  }

  throw lastError;
}
