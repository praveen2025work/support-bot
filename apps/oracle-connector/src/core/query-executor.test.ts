import { test } from "node:test";
import assert from "node:assert/strict";
import { enforceRowLimit, validateReadOnly } from "@/core/query-executor";

// Oracle pushes the row limit down via `maxRows: limit + 1` in conn.execute,
// so the post-fetch enforceRowLimit still sees one extra row and can flag
// truncation. These tests lock that contract in place.

test("enforceRowLimit detects truncation when execute returns the +1 row", () => {
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

test("enforceRowLimit reports no truncation when under the limit", () => {
  const { truncated, totalRowsBeforeTruncation } = enforceRowLimit(
    [{ a: 1 }, { a: 2 }],
    10,
  );
  assert.equal(truncated, false);
  assert.equal(totalRowsBeforeTruncation, 2);
});

test("validateReadOnly allows SELECT/WITH and blocks mutations", () => {
  assert.equal(validateReadOnly("SELECT * FROM dual").valid, true);
  assert.equal(
    validateReadOnly("WITH t AS (SELECT 1 AS x FROM dual) SELECT x FROM t")
      .valid,
    true,
  );
  assert.equal(validateReadOnly("UPDATE t SET x = 1").valid, false);
});
