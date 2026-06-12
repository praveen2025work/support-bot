import { describe, it, expect } from "vitest";
import { tempPathFor } from "@/core/store/per-group-store";

// Multi-instance safety: when several engine replicas share one volume, the
// atomic-write temp file must be unique ACROSS containers. process.pid is NOT
// unique across PID-namespaced pods (often 1 everywhere), so the temp name must
// carry a high-entropy component. Otherwise two replicas overwriting the same
// group file (e.g. via the bridge's rebuildAllGroupFiles) can collide on the
// temp path and corrupt it.
describe("PerGroupStore temp-file naming (multi-instance atomic write)", () => {
  it("produces a unique, high-entropy temp path per call", () => {
    const file = "/data/queries/finance.json";
    const a = tempPathFor(file);
    const b = tempPathFor(file);
    expect(a).not.toBe(b);
    expect(a).not.toBe(file);
    expect(a.startsWith(file + ".tmp.")).toBe(true);
    // pid.counter.<random-hex> — the trailing hex is what guarantees
    // cross-container uniqueness independent of pid/INSTANCE_ID.
    expect(a).toMatch(/\.tmp\.\d+\.\d+\.[0-9a-f]{8,}$/);
  });

  it("generates distinct temp names across many rapid calls", () => {
    const file = "/x/y.json";
    const names = new Set(Array.from({ length: 200 }, () => tempPathFor(file)));
    expect(names.size).toBe(200);
  });
});
