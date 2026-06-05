import { describe, it, expect } from "vitest";
import path from "path";
import { paths } from "@/lib/env-config";

// Security: groupId reaches paths.data.queries() from unauthenticated request
// input (GET /api/queries?groupId=...). It MUST be sanitized so a crafted id
// like "../../config/settings" cannot escape the queries directory and read
// arbitrary files. This mirrors the sanitization used by the sibling per-group
// paths (watchRules, workflows, userPrefs, sessionFile, schemaFile).
describe("paths.data.queries sanitizes groupId (path traversal)", () => {
  const dir = path.resolve(paths.data.queriesDir);

  it("keeps the resolved file inside the queries dir for malicious group ids", () => {
    for (const evil of [
      "../../etc/passwd",
      "../../../mock-api/db",
      "..",
      "a/b",
      "x/../../y",
      "/abs/olute",
    ]) {
      const resolved = path.resolve(paths.data.queries(evil));
      expect(resolved.startsWith(dir + path.sep)).toBe(true);
    }
  });

  it("leaves normal group ids intact", () => {
    expect(paths.data.queries("finance")).toBe(
      path.join(paths.data.queriesDir, "finance.json"),
    );
    expect(paths.data.queries("hr_team")).toBe(
      path.join(paths.data.queriesDir, "hr_team.json"),
    );
  });
});
