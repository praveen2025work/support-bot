import { readFileSync, statSync } from "fs";
import { paths } from "@/lib/env-config";
import bundled from "./filter-config.json";

let cache: Record<string, unknown> = bundled as Record<string, unknown>;
let lastMtimeMs: number | null = null;

/**
 * Filter config (`filter-config.json`), read from the runtime CONFIG_DIR file
 * and reloaded when its mtime changes — so admin edits propagate to every
 * instance on the next read (no restart). Avoids the build-time bundled
 * snapshot that a static `import` would otherwise freeze into `dist`.
 *
 * Resilient: a missing file (first boot / no volume) or a corrupt/in-flight
 * write keeps the last good value (the bundled snapshot on first boot).
 */
export function getFilterConfig(): Record<string, unknown> {
  let mtimeMs: number;
  try {
    mtimeMs = statSync(paths.config.filterConfig).mtimeMs;
  } catch {
    return cache; // no runtime file — keep current (bundled / last good)
  }
  if (mtimeMs === lastMtimeMs) return cache;
  try {
    cache = JSON.parse(readFileSync(paths.config.filterConfig, "utf-8"));
    lastMtimeMs = mtimeMs;
  } catch {
    // corrupt / partially-written — keep last good, retry next read
  }
  return cache;
}
