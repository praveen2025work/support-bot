# v0.1 Pilot Smoke Checklist

Run before every release tag (`v0.1-pilot`, `v0.1.1-pilot`, ...). Estimated time: ~2 hours for a full sweep.

This checklist exists because automated tests cover unit/integration paths but cannot prove the full chat experience works end-to-end with real users in a real browser. Treat each section as a hard gate — if any step fails, the release does not ship.

---

## Pre-flight (one-time setup per release)

- [ ] Engine running locally on `http://localhost:4001` (`cd services/engine && npm run dev`)
- [ ] UI running on `http://localhost:3001` (or `3002` if conflicting) (`npx next dev -p 3001`)
- [ ] Mock API running on `http://localhost:8081` (or `8080`) (`npm run svc:mock-api`)
- [ ] Tail engine logs in a separate terminal: `tail -f services/engine/data/logs/conversations.jsonl`
- [ ] Tail audit logs: `tail -f services/engine/data/audit/audit.jsonl`
- [ ] Open browser devtools → Network tab — leave open during the sweep so failed requests are visible

---

## Section A: Critical user paths (15 min)

For each row: type the prompt in chat, observe the response, mark pass/fail.

### A1: High-confidence query (should execute directly)

| #   | User input            | Expected response                                         | Pass? |
| --- | --------------------- | --------------------------------------------------------- | ----- |
| 1   | `hello`               | Greeting message; no chips                                |       |
| 2   | `help`                | Help message with quick-start options                     |       |
| 3   | `list queries`        | List of available queries with descriptions               |       |
| 4   | `run monthly_revenue` | Filter form OR direct results (depending on query config) |       |
| 5   | `goodbye`             | Farewell message                                          |       |

### A2: Disambiguation flow (the credibility-defining feature)

| #   | User input                                | Expected response                                                      | Pass? |
| --- | ----------------------------------------- | ---------------------------------------------------------------------- | ----- |
| 6   | `show revenue numbers`                    | "Did you mean…?" chips with 2-3 query candidates                       |       |
| 7   | Click a chip from #6                      | The chosen query runs; transcript shows chip label as if user typed it |       |
| 8   | `i want to see active users`              | Either confident match OR disambig chips (depending on confidence)     |       |
| 9   | (after #8 if chips appeared) Click a chip | Chosen query runs                                                      |       |
| 10  | `asdfghjkl qwerty`                        | "I don't understand…" message; no chips                                |       |

### A3: Filter handling

| #   | User input                                   | Expected response                                        | Pass? |
| --- | -------------------------------------------- | -------------------------------------------------------- | ----- |
| 11  | `run monthly_revenue for this quarter`       | Query runs with date range filter applied (last 90 days) |       |
| 12  | `run monthly_revenue for this quarter in EU` | Query runs with both filters                             |       |
| 13  | `run order_details status Completed`         | Query runs with SQL inline filter                        |       |
| 14  | `run monthly_revenue` then "Skip filters"    | Query runs unfiltered                                    |       |

### A4: Error handling

| #   | Action                         | Expected response                                                 | Pass? |
| --- | ------------------------------ | ----------------------------------------------------------------- | ----- |
| 15  | Type a 2000+ character message | Either accepted OR clear "too long" error; no crash               |       |
| 16  | Open chat with engine stopped  | Friendly "engine unreachable" or retry option                     |       |
| 17  | Submit empty message           | Send button disabled or graceful no-op                            |       |
| 18  | Refresh page mid-query         | Resumes cleanly; old session OR fresh session, never broken state |       |

---

## Section B: Admin surfaces (15 min)

Login as an admin user (`/admin`).

- [ ] Admin home loads; sidebar shows Groups, Queries, Intents, Filters, Templates, Users, Settings
- [ ] Groups list loads; click into a group; group detail page renders
- [ ] **Synonyms sub-route**: navigate to `/admin/groups/<id>/synonyms` directly (link from groups page may not be wired yet — see follow-ups in commit `a12ea33`)
  - [ ] Empty state shows "Add your first synonym" CTA
  - [ ] Add a synonym (canonical: `revenue`, synonyms: [`income`, `sales`])
  - [ ] Refresh page; synonym persists
  - [ ] Delete the synonym; confirmation modal appears
- [ ] **Audit log**: navigate to admin audit view (path varies by build)
  - [ ] Recent chat events appear with action=execute, resource=query
  - [ ] Synonym CRUD events appear with action=create/update/delete, resource=synonym
- [ ] **Intents admin**: list of intents loads; clicking one shows utterances + answers
- [ ] **Files admin**: file upload form; small file (<1MB) uploads successfully

---

## Section C: Security boundaries (10 min)

Run these checks via `curl` against the engine. Replace `<groupId>` and IDs as needed.

- [ ] **forceIntent rejection** — foreign intent returns 400:

  ```bash
  curl -sS -w "\n[%{http_code}]\n" -X POST http://localhost:4001/api/chat \
    -H "Content-Type: application/json" \
    -d '{"text":"x","platform":"web","sessionId":"s","groupId":"default","userName":"u","forceIntent":"this_query_does_not_exist_xyz"}'
  ```

  Expect: `{"error":"forceIntent not permitted for this group"}` HTTP 400.

- [ ] **Path traversal blocked on file upload**:

  ```bash
  curl -sS -w "\n[%{http_code}]\n" -X POST http://localhost:3001/api/admin/files \
    -H "Content-Type: application/json" \
    -d '{"name":"../../etc/passwd","content":"x"}'
  ```

  Expect: 400 with no file written outside `services/engine/data/`.

- [ ] **Admin auth required on file endpoints**:

  ```bash
  curl -sS -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3001/api/admin/files \
    -H "Content-Type: application/json" \
    -d '{"name":"x","content":"x"}'
  ```

  Expect: 401 (no admin cookie).

- [ ] **CSRF blocked on state-changing admin requests** (no token header):

  ```bash
  curl -sS -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3001/api/admin/groups \
    -H "Content-Type: application/json" -d '{}'
  ```

  Expect: 403 with `CSRF validation failed`.

- [ ] **Rate limit on chat** (300/min): hammer 350 requests in 60s, observe 429s after threshold.

- [ ] **Engine timing-safe auth**: with `ENGINE_API_KEY` set, requests with wrong key get 401; the response time for wrong-by-first-char vs wrong-by-last-char is statistically indistinguishable (eyeball check; not measured here).

---

## Section D: Disambiguation calibration (5 min)

Confirm the threshold + floor are in effect by sampling queries that previously sat below the old threshold (0.65) but should now classify confidently:

| User input                    | Expected (with threshold 0.6, floor 0.4)                                                  | Pass? |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ----- |
| `run monthly_revenue`         | Confident execute (was 0.445 — below 0.65; now triggers disambig band [0.4, 0.6) → chips) |       |
| `execute active_users`        | Confident execute (0.635 — above 0.6)                                                     |       |
| `i need help getting started` | Confident "help" (0.613 — above 0.6)                                                      |       |
| `where is the api docs`       | Below floor → "I don't understand" (0.287 — below 0.4)                                    |       |

If any row fails: re-run `npm test -- tests/nlp/threshold-calibration.test.ts`, compare results to `tests/nlp/threshold-calibration-results.md`. The numbers should match within ±0.05 for in-corpus utterances; large drift means the corpus has changed.

---

## Section E: Persistence & data integrity (5 min)

- [ ] Send 5 chat messages; refresh page; chat history reloads (or correctly resets to fresh session, depending on session policy)
- [ ] Click a "Did you mean?" chip; verify `services/engine/data/learning/<groupId>/signal-aggregates.json` contains a new entry keyed on the original user text (not the chip label)
- [ ] Add a synonym via admin UI; verify `services/engine/data/learning/<groupId>/synonyms.json` contains the new entry
- [ ] Run a query; verify `services/engine/data/audit/audit.jsonl` has a new line with `action=execute`, the user, the query name, and the IP

---

## Section F: Browser sweep (10 min)

Repeat Section A1 (the 5 high-confidence query rows) in:

- [ ] Chrome / Edge (Chromium)
- [ ] Safari
- [ ] Firefox

Watch for: console errors, layout breakage, chip rendering, filter form alignment.

---

## Section G: Performance smoke (5 min)

- [ ] Type a query; total time from send to first byte of response: **< 2 seconds** for cached, **< 5 seconds** for cold
- [ ] Open `/api/health`: response time **< 100ms**
- [ ] No memory leak after 50 chat messages (engine memory in `/api/health` should stabilize, not grow linearly)

---

## Sign-off

- Tester name: ********\_\_\_\_********
- Build / commit SHA: ********\_\_\_\_******** (`git rev-parse --short HEAD`)
- Date: ********\_\_\_\_********
- All sections pass? ☐ yes ☐ no
- If no, blocking issues filed at: ********\_\_\_\_********

If yes, this build is cleared for pilot deploy.

---

## Known pre-existing issues that are NOT blockers

These exist at HEAD and are documented as known-issue, deferred to post-pilot:

- `services/engine/src/__tests__/session-manager.test.ts` — 5/6 tests fail in isolation due to `SessionManager.size()`/`destroy()` async refactor mismatch with sync test code. Runtime is fine.
- `src/__tests__/ThemeContext.test.tsx` — uses `'midnight'` / `'ocean'` theme names that don't exist in the type union.
- `src/__tests__/chat/DataPanel.test.tsx`, `src/__tests__/shell/Sidebar.test.tsx` — pre-existing flakes; unrelated to chat path.
- 30 silent `.catch(() => {})` blocks in pre-existing UI/engine code (B-2 standard requires no NEW silent catches; existing ones triaged post-pilot).
- Three follow-up wires (commit `a12ea33` notes them):
  1. Mount synonyms router in `services/engine/src/routes/admin/index.ts`
  2. Add "Manage synonyms" link in `src/app/admin/groups/[id]/page.tsx`
  3. Pass `groupId` to `expandWithSynonyms()` at NLP call sites

None of these block the pilot; they're tracked for v0.2.
