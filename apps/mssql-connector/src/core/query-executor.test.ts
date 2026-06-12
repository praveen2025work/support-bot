import { test } from "node:test";
import assert from "node:assert/strict";
import {
  injectTopLimit,
  enforceRowLimit,
  validateReadOnly,
} from "@/core/query-executor";

// ── injectTopLimit: safe SELECT pushdown ────────────────────────────
test("injectTopLimit injects TOP into a plain SELECT", () => {
  const { sql, injected } = injectTopLimit("SELECT id, name FROM users", 100);
  assert.equal(injected, true);
  assert.equal(sql, "SELECT TOP (100) id, name FROM users");
});

test("injectTopLimit handles SELECT DISTINCT", () => {
  const { sql, injected } = injectTopLimit(
    "SELECT DISTINCT region FROM sales",
    50,
  );
  assert.equal(injected, true);
  assert.equal(sql, "SELECT DISTINCT TOP (50) region FROM sales");
});

test("injectTopLimit is case-insensitive and trims", () => {
  const { sql, injected } = injectTopLimit("  select x from t  ", 5);
  assert.equal(injected, true);
  assert.equal(sql, "select TOP (5) x from t");
});

// ── injectTopLimit: skip unsafe / complex statements ────────────────
test("injectTopLimit skips a CTE (WITH …)", () => {
  const cte = "WITH t AS (SELECT id FROM users) SELECT id FROM t WHERE id > 0";
  const { sql, injected } = injectTopLimit(cte, 100);
  assert.equal(injected, false);
  assert.equal(sql, cte);
});

test("injectTopLimit skips a stored-procedure call (EXEC)", () => {
  const exec = "EXEC dbo.GetUsers @region = @region";
  const { sql, injected } = injectTopLimit(exec, 100);
  assert.equal(injected, false);
  assert.equal(sql, exec);
});

test("injectTopLimit skips when TOP already present", () => {
  const existing = "SELECT TOP (10) id FROM users";
  const { sql, injected } = injectTopLimit(existing, 100);
  assert.equal(injected, false);
  assert.equal(sql, existing);
});

test("injectTopLimit skips when TOP (no parens) already present", () => {
  const existing = "SELECT TOP 10 id FROM users";
  const { injected } = injectTopLimit(existing, 100);
  assert.equal(injected, false);
});

test("injectTopLimit skips when OFFSET present", () => {
  const offset =
    "SELECT id FROM users ORDER BY id OFFSET 10 ROWS FETCH NEXT 20 ROWS ONLY";
  const { injected } = injectTopLimit(offset, 100);
  assert.equal(injected, false);
});

test("injectTopLimit skips for non-positive / non-finite limits", () => {
  assert.equal(injectTopLimit("SELECT 1", 0).injected, false);
  assert.equal(injectTopLimit("SELECT 1", -5).injected, false);
  assert.equal(injectTopLimit("SELECT 1", NaN).injected, false);
});

// ── enforceRowLimit still detects truncation with the +1 fetch ──────
test("enforceRowLimit detects truncation when TOP (limit+1) returns extra row", () => {
  // limit = 2, server returned 3 rows because we asked for TOP (3).
  const rows = [{ a: 1 }, { a: 2 }, { a: 3 }];
  const {
    rows: out,
    truncated,
    totalRowsBeforeTruncation,
  } = enforceRowLimit(rows, 2);
  assert.equal(truncated, true);
  assert.equal(out.length, 2);
  assert.equal(totalRowsBeforeTruncation, 3);
});

test("enforceRowLimit reports no truncation when under limit", () => {
  const { truncated } = enforceRowLimit([{ a: 1 }], 10);
  assert.equal(truncated, false);
});

// ── sanity: validateReadOnly unaffected ─────────────────────────────
test("validateReadOnly still allows SELECT and blocks mutations", () => {
  assert.equal(validateReadOnly("SELECT 1").valid, true);
  assert.equal(validateReadOnly("DELETE FROM users").valid, false);
});
