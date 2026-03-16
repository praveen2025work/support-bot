# Multi-Tenant Embedded Bot Platform — Comprehensive Code Audit

**Audit Date:** 2026-03-12
**Auditor:** Enterprise Architect Review
**Codebase Snapshot:** `b2bfabd` (HEAD)
**Files Analyzed:** 142 source files across Next.js UI, Express Engine, Mock API

---

## 1. Executive Summary

This platform demonstrates a well-structured multi-service architecture (Next.js UI + Express Engine + Mock API) with a clean separation between NLP classification, query execution, and response generation. The NLP pipeline, adapter pattern, and per-group corpus training are architecturally sound.

However, the platform has **critical security gaps** (path traversal, missing auth on file endpoints, timing-attack-vulnerable auth), **zero test coverage**, and **no CI/CD pipeline**. Session management is purely in-memory with no cap, the learning system uses synchronous file I/O, and several monolithic files (response-generator.ts at 1,358 lines, admin.ts at 693 lines) present maintainability risks. The platform is **suitable for internal demo/POC use** but requires significant hardening before any production deployment.

**Readiness Score: 4.5 / 10** — Functional prototype with good architectural bones, but not production-ready.

---

## 2. Score Card

| # | Dimension | Score (1-5) | Finding |
|---|-----------|:-----------:|---------|
| 1 | Architecture & Design Patterns | 3.5 | Clean layered design (Engine → NLP → QueryService → ResponseGenerator) with adapter pattern, but monolithic files and duplicated code between UI/Engine |
| 2 | NLP Pipeline Quality | 3.5 | Per-group corpus training, confidence thresholds, fuzzy fallback chain all present; lacks entity validation, no intent overlap detection |
| 3 | Multi-Tenancy & Isolation | 3.0 | Per-group NLP models and config, but no RBAC enforcement, no tenant context propagation, shared session store |
| 4 | Data Source Integration | 3.5 | Supports API/Document/CSV/URL types with auth strategies (Bearer/Windows/BAM), but no circuit breaker, no retry logic |
| 5 | Response Quality | 4.0 | Rich content types (tables, charts, cards, suggestions), template-based responses with variation; no i18n |
| 6 | Security | 2.0 | Path traversal vulnerabilities, missing auth on file endpoints, timing-attack-vulnerable comparison, no CSRF |
| 7 | Error Handling & Resilience | 2.5 | Global error handler exists, custom error hierarchy, but silent catch blocks throughout, no React error boundaries |
| 8 | Performance & Scalability | 3.0 | LRU cache on API calls, singleton engine instances, but unbounded sessions, synchronous file I/O in learning |
| 9 | Testing & Code Quality | 1.0 | Zero test files, jest configured but unused; TypeScript strict mode enabled but `any` types scattered |
| 10 | Production Readiness | 3.0 | Dockerfiles and compose files exist, health endpoints present, Pino structured logging; but no readiness probes, no graceful shutdown |

---

## 3. Critical Gaps (🔴)

### 🔴 3.1 Path Traversal on File Endpoints

**Problem:** The admin file upload/download/delete and read endpoints sanitize filenames by stripping special characters but do not verify the resolved path stays within the allowed directory.

**Files:**
- `src/app/api/admin/files/route.ts` (lines 54, 74) — POST and DELETE
- `src/app/api/admin/files/read/route.ts` (lines 16–18) — GET

**Code (files/route.ts, POST handler):**
```typescript
const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '-');
const filePath = join(DATA_DIR, safeName);
// ❌ No check that filePath is actually inside DATA_DIR
```

**Risk:** An attacker could craft filenames like `..--..--etc--passwd` (after sanitization edge cases) to read/write/delete files outside the data directory. While the current regex blocks `../`, symlink attacks or platform-specific edge cases remain.

**Fix:**
```typescript
const resolved = path.resolve(DATA_DIR, safeName);
if (!resolved.startsWith(path.resolve(DATA_DIR) + path.sep)) {
  return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
}
```

---

### 🔴 3.2 Missing Admin Auth on File Endpoints

**Problem:** All `/api/admin/files/*` endpoints (GET, POST, DELETE) perform **no authorization check**. Any unauthenticated request can upload, read, or delete knowledge base files.

**File:** `src/app/api/admin/files/route.ts` — no call to `isRequestAdmin(request)` anywhere.

**Contrast:** Other admin endpoints like `/api/admin/intents/route.ts` and `/api/admin/settings/route.ts` do call `isRequestAdmin`.

**Risk:** Complete knowledge base takeover. An attacker can replace document files with malicious content, delete critical files, or exfiltrate sensitive documents.

**Fix:** Add auth check to every handler:
```typescript
export async function POST(request: NextRequest) {
  const auth = await isRequestAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // ... existing logic
}
```

---

### 🔴 3.3 Timing-Attack Vulnerable Auth Comparison

**Problem:** The engine API key is compared using JavaScript string equality (`!==`), which is vulnerable to timing attacks — an attacker can determine the key character-by-character by measuring response times.

**File:** `services/engine/src/middleware/auth.ts` (line 53)
```typescript
if (provided !== engineApiKey) {  // ❌ Timing-vulnerable
```

**Fix:**
```typescript
import { timingSafeEqual } from 'crypto';

const a = Buffer.from(provided || '');
const b = Buffer.from(engineApiKey);
if (a.length !== b.length || !timingSafeEqual(a, b)) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

---

### 🔴 3.4 Zero Test Coverage

**Problem:** There are **zero test files** in the entire project. Jest is configured (`jest.config.ts`) and test dependencies installed (`@testing-library/react`, `@testing-library/jest-dom`, `msw`), but no tests exist.

**Risk:** Every code change, including the fixes recommended in this audit, carries regression risk. The NLP classification pipeline, response generation, filter resolution, CSV aggregation, and auth middleware all have complex logic paths that are entirely unvalidated.

**Immediate need:**
1. Unit tests for NLP classification (threshold behavior, fuzzy fallback)
2. Unit tests for CSV aggregation (edge cases: empty data, NaN values)
3. Integration tests for auth middleware
4. API route tests for CRUD operations

---

### 🔴 3.5 No CSRF Protection on State-Changing Operations

**Problem:** All POST/PATCH/DELETE admin API routes accept requests without CSRF tokens. Since the admin UI uses cookie-based auth (forwarded from the parent app), any site can forge cross-origin requests.

**Affected routes:** All `/api/admin/*` POST/PATCH/DELETE endpoints (queries, groups, users, settings, templates, filters, files).

**Fix:** Implement CSRF token validation via Next.js middleware or a custom token-in-header pattern:
```typescript
// Next.js middleware.ts
if (request.nextUrl.pathname.startsWith('/api/admin') && ['POST','PATCH','DELETE'].includes(request.method)) {
  const csrfHeader = request.headers.get('x-csrf-token');
  const csrfCookie = request.cookies.get('csrf-token')?.value;
  if (!csrfHeader || csrfHeader !== csrfCookie) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }
}
```

---

### 🔴 3.6 No Teams Webhook Signature Verification

**Problem:** The Teams adapter accepts incoming webhook payloads without verifying the Bot Framework signature. Any HTTP client can post fake messages to `/api/webhooks/teams`.

**File:** `services/engine/src/adapters/teams/teams-adapter.ts` (line 115)
```typescript
async verifyRequest(): Promise<boolean> {
  return !!headers['authorization'];  // ❌ Only checks header existence
}
```

**Fix:** Validate the JWT token from the Bot Framework using Microsoft's public keys:
```typescript
import { verifyBotFrameworkToken } from './teams-auth';
async verifyRequest(headers: Record<string, string>): Promise<boolean> {
  const token = headers['authorization']?.replace('Bearer ', '');
  return token ? await verifyBotFrameworkToken(token) : false;
}
```

---

## 4. Medium Gaps (🟡)

### 🟡 4.1 Unbounded In-Memory Session Store

**File:** `services/engine/src/core/session/session-manager.ts`
**Issue:** Sessions are stored in a `Map` with no maximum size. Under sustained load or a session-flooding attack, memory grows unbounded.
**Fix:** Add a `maxSessions` cap or replace with LRU-based storage. The cleanup interval (60s) only purges expired sessions, not overflow.

### 🟡 4.2 Synchronous File I/O in Learning Service

**File:** `services/engine/src/core/learning/learning-service.ts` (lines 63–64, 254–298)
**Issue:** Uses `fs.readFileSync` / `fs.writeFileSync` in several methods, blocking the event loop during file operations.
**Fix:** Replace all sync I/O with async equivalents (`fs.promises.*`).

### 🟡 4.3 Single-Process Mutex Insufficient for Multi-Instance

**File:** `src/lib/db.ts` (lines 6–27)
**Issue:** The `withDbLock` mutex serializes operations within a single Node.js process, but Next.js in production can spawn multiple workers. File corruption possible under concurrent writes.
**Fix:** Use file-level locking (`proper-lockfile` npm package) or migrate to a database.

### 🟡 4.4 Duplicated Core Code Between UI and Engine

**Issue:** The `src/core/`, `src/adapters/`, `src/config/`, `src/lib/`, `src/training/` directories are near-identical copies between the Next.js app and the Engine service. Changes must be synchronized manually.

**Evidence:**
- `src/core/engine.ts` ↔ `services/engine/src/core/engine.ts`
- `src/core/nlp/nlp-service.ts` ↔ `services/engine/src/core/nlp/nlp-service.ts`
- `src/core/api-connector/*` ↔ `services/engine/src/core/api-connector/*`
- Plus adapters, config, lib, training directories

**Risk:** Code drift between the two copies. The engine version has features (learning service integration) that the UI-embedded version lacks.
**Fix:** Extract shared code into a `packages/core` workspace package, or eliminate the duplication by always routing through the engine service.

### 🟡 4.5 Monolithic Files Exceed Maintainability Thresholds

| File | Lines | Issue |
|------|------:|-------|
| `services/engine/src/core/response/response-generator.ts` | 1,358 | Single class with 40+ methods handling all intent routing, filter extraction, response formatting |
| `services/engine/src/routes/admin.ts` | 693 | All admin CRUD in one file (groups, queries, filters, intents, entities, templates, users, files, learning, settings) |
| `src/app/admin/groups/[id]/page.tsx` | 891 | Group config + query editor + filter management in one component |
| `src/components/chat/MessageBubble.tsx` | 596 | Renders 11 different rich content types in one component |

**Fix:** Split by domain. E.g., `admin.ts` → `admin/groups.ts`, `admin/queries.ts`, `admin/learning.ts`, etc.

### 🟡 4.6 No Rate Limiting on Next.js API Routes

**Issue:** The Engine service has rate limiting (`express-rate-limit` in `server.ts` lines 24–38), but the Next.js proxy routes (`src/app/api/*`) have **no rate limiting**. In monolith mode (no ENGINE_URL), these routes handle all traffic unthrottled.
**Fix:** Add rate limiting via Next.js middleware or use `@upstash/ratelimit`.

### 🟡 4.7 No Retry Logic or Circuit Breaker for External APIs

**File:** `services/engine/src/core/api-connector/api-client.ts`
**Issue:** Single-attempt requests with 30s timeout. If the tenant API is slow or intermittently failing, every request fails.
**Fix:** Implement exponential backoff with `ky` retry options (already a dependency), and add a circuit breaker pattern for repeated failures.

### 🟡 4.8 Conversation Logs Stored in Plaintext

**File:** `services/engine/src/routes/chat.ts` (lines 63–74)
**Issue:** User messages and bot responses written to `data/logs/conversations.jsonl` unencrypted. Sensitive data (PII, financial queries) persisted without protection.
**Fix:** At minimum, implement log rotation and access controls. For compliance, add encryption-at-rest.

### 🟡 4.9 Missing Security Headers

**Issue:** No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security` headers set on any responses.
**Fix:** Add a Next.js middleware to set security headers on all responses:
```typescript
// middleware.ts
const headers = new Headers(response.headers);
headers.set('X-Content-Type-Options', 'nosniff');
headers.set('X-Frame-Options', 'SAMEORIGIN');
headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
```

### 🟡 4.10 Widget postMessage Broadcasts to All Origins

**File:** `src/components/chat/ChatWindow.tsx` (line 25)
```typescript
window.parent.postMessage({ type: 'chatbot-close' }, '*');
```
**Risk:** Any page embedding the widget can intercept these messages. Should target the specific parent origin.

---

## 5. Low Priority (🟢)

### 🟢 5.1 `any` Types Defeat TypeScript Safety

Multiple instances of `any` bypass type checking:
- `services/engine/src/core/nlp/nlp-service.ts` (line 60): `const result: any = await this.nlp.process('en', text)`
- `services/engine/src/core/api-connector/api-client.ts` (line 11): `private cache: LRUCache<string, any>`
- `services/engine/src/core/response/response-generator.ts`: multiple `as` type assertions

### 🟢 5.2 Insecure UUID Fallback

**File:** `services/engine/src/lib/generate-id.ts` (lines 18–22)
```typescript
// Fallback uses Math.random() — not cryptographically secure
'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ...)
```
Modern Node.js (16+) has `crypto.randomUUID()`, and the platform requires Node 16+. The fallback should use `crypto.getRandomValues()`.

### 🟢 5.3 No i18n/Localization

Response templates (`services/engine/src/core/response/templates.ts`) are English-only with no localization framework.

### 🟢 5.4 No Log Rotation

Pino logger (`services/engine/src/lib/logger.ts`) writes to stdout with no rotation. In containerized deployments this is fine (container runtime handles log collection), but for VM deployments, logs grow unbounded.

### 🟢 5.5 ~~Missing React Error Boundaries~~ ✅ RESOLVED

React Error Boundary component added at `src/components/chat/ErrorBoundary.tsx` wrapping chat components. Storybook stories verify both normal rendering and error recovery scenarios.

### 🟢 5.6 Cleanup Interval Resource Leak

**File:** `services/engine/src/core/session/session-manager.ts` (line 12)
The `setInterval` for session cleanup is created in the constructor but `destroy()` is never called by any code path. Leaks if engines are garbage collected.

### 🟢 5.7 ~~No ESLint Configuration File~~ ✅ RESOLVED

ESLint flat config added at `eslint.config.mjs` with Next.js and TypeScript rules enforced.

### 🟢 5.8 Hardcoded Stop Words Duplicated

Stop words are duplicated in `response-generator.ts` at lines 26–31 and lines 1265–1269. Should be a shared constant.

---

## 6. Architecture Recommendations

### Current Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js UI (port 3001)          │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Chat UI  │  │ Admin UI │  │ API Proxy     │  │
│  │ (React)  │  │ (React)  │  │ Routes        │  │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │                │          │
│  ┌────┴──────────────┴────────────────┴───────┐  │
│  │  Embedded Core (src/core/) — DUPLICATE     │  │◄── Problem: duplicated
│  │  NLP + QueryService + ResponseGen          │  │    code for "monolith mode"
│  └────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────┘
                       │ HTTP (when ENGINE_URL set)
┌──────────────────────▼───────────────────────────┐
│              Engine Service (port 4001)            │
│  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│  │ NLP      │  │ Query     │  │ Response      │  │
│  │ Service  │  │ Service   │  │ Generator     │  │
│  └──────────┘  └───────────┘  └───────────────┘  │
│  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│  │ Learning │  │ Session   │  │ Admin Routes  │  │
│  │ Service  │  │ Manager   │  │ (693 lines!)  │  │
│  └──────────┘  └───────────┘  └───────────────┘  │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│              Mock API / Tenant API (port 8080)    │
│  JSON-Server with db.json  OR  Real tenant APIs   │
└──────────────────────────────────────────────────┘
```

### Target Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js UI (port 3001)          │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Chat UI  │  │ Admin UI │  │ Thin Proxy    │  │
│  │ (React)  │  │ (React)  │  │ Only          │  │
│  │ + Error  │  │ + RBAC   │  │ (no core)     │  │
│  │ Boundary │  │          │  │ + CSRF        │  │
│  └──────────┘  └──────────┘  │ + Rate Limit  │  │
│                               └───────────────┘  │
│  middleware.ts: Security headers, CSRF, rate limit│
└──────────────────────┬───────────────────────────┘
                       │ HTTP (always through Engine)
┌──────────────────────▼───────────────────────────┐
│              Engine Service (port 4001)            │
│  ┌────────────────────────────────────────────┐   │
│  │ Auth Middleware (timing-safe, rate-limited) │   │
│  └────────────────────────────────────────────┘   │
│  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│  │ NLP Svc  │  │ Query Svc │  │ Response Gen  │  │
│  │ (per-    │  │ (circuit  │  │ (split by     │  │
│  │  tenant) │  │  breaker) │  │  intent type) │  │
│  └──────────┘  └───────────┘  └───────────────┘  │
│  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│  │ Learning │  │ Session   │  │ Admin Routes  │  │
│  │ (async   │  │ (bounded  │  │ (split into   │  │
│  │  I/O)    │  │  + Redis) │  │  modules)     │  │
│  └──────────┘  └───────────┘  └───────────────┘  │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│              Tenant APIs / Data Layer              │
│  With retry logic, circuit breaker, timeouts      │
└──────────────────────────────────────────────────┘
```

**Key changes from current → target:**
1. **Remove duplicated core from UI** — Always route through Engine. Eliminate `src/core/` from Next.js app.
2. **Add security middleware** to Next.js (CSRF, rate limiting, security headers).
3. **Split monolithic files** — admin routes by domain, response generator by intent category.
4. **Bounded session store** with optional Redis backend.
5. **Circuit breaker + retry** on ApiClient for tenant API resilience.
6. **RBAC enforcement** — Admin pages require authenticated admin role, not just route-level checks.

---

## 7. Prioritized Action Plan

### Week 1–2: Security & Stability (Must-Haves)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1 | Fix path traversal in file endpoints — add `path.resolve()` validation | `src/app/api/admin/files/route.ts`, `src/app/api/admin/files/read/route.ts` | 2h |
| 2 | Add admin auth checks to file endpoints | `src/app/api/admin/files/route.ts`, `src/app/api/admin/files/read/route.ts` | 1h |
| 3 | Replace string comparison with `timingSafeEqual` in engine auth | `services/engine/src/middleware/auth.ts` | 1h |
| 4 | Add CSRF token validation middleware | New `src/middleware.ts` | 4h |
| 5 | Add security headers (CSP, X-Frame-Options, HSTS) | `src/middleware.ts` (extend from #4) | 2h |
| 6 | Add rate limiting to Next.js API routes | `src/middleware.ts` | 3h |
| 7 | Implement Teams webhook signature verification | `services/engine/src/adapters/teams/teams-adapter.ts` | 4h |
| 8 | Fix `postMessage` to use specific origin | `src/components/chat/ChatWindow.tsx` | 1h |
| 9 | Cap session store size (maxSessions) | `services/engine/src/core/session/session-manager.ts` | 2h |
| 10 | Add React Error Boundary to chat components | New `src/components/chat/ErrorBoundary.tsx` | 2h |

### Week 3–4: NLP Pipeline & Data Isolation

| # | Task | Files | Effort |
|---|------|-------|--------|
| 11 | Add unit tests for NLP classification (thresholds, fuzzy fallback, entity extraction) | New `tests/nlp/` | 8h |
| 12 | Add unit tests for CSV analyzer (aggregation, edge cases) | New `tests/csv/` | 6h |
| 13 | Add integration tests for auth middleware | New `tests/auth/` | 4h |
| 14 | Add API route tests for admin CRUD | New `tests/api/` | 8h |
| 15 | Replace synchronous file I/O in learning service | `services/engine/src/core/learning/learning-service.ts` | 3h |
| 16 | Add tenant context propagation through request lifecycle | `services/engine/src/routes/chat.ts`, middleware | 4h |
| 17 | Add intent overlap detection / ambiguity warnings to admin | `services/engine/src/core/nlp/nlp-service.ts`, admin API | 6h |

### Week 5–6: Integration Resilience & Caching

| # | Task | Files | Effort |
|---|------|-------|--------|
| 18 | Add retry logic with exponential backoff to ApiClient | `services/engine/src/core/api-connector/api-client.ts` | 4h |
| 19 | Add circuit breaker pattern for external API calls | `services/engine/src/core/api-connector/api-client.ts` | 6h |
| 20 | Replace in-process mutex with file-level locking (or SQLite) | `src/lib/db.ts` | 6h |
| 21 | Encrypt conversation logs at rest | `services/engine/src/routes/chat.ts`, data layer | 4h |
| 22 | Add log rotation and log-level filtering | `services/engine/src/lib/logger.ts` | 2h |
| 23 | Add readiness probe that checks NLP model + API connectivity | `services/engine/src/routes/health.ts` | 3h |
| 24 | Add graceful shutdown handler | `services/engine/src/server.ts` | 2h |

### Week 7–8: Admin Portal & Self-Service Config

| # | Task | Files | Effort |
|---|------|-------|--------|
| 25 | Split `admin.ts` into domain-specific route files | `services/engine/src/routes/admin/` | 6h |
| 26 | Split `response-generator.ts` into handler modules | `services/engine/src/core/response/` | 8h |
| 27 | Add RBAC with roles (admin, builder, viewer) | Auth middleware, admin pages | 10h |
| 28 | Add audit logging for all admin config changes | Admin routes, new audit service | 6h |
| 29 | Remove duplicated core from Next.js (always use Engine) | `src/core/`, `src/adapters/`, `src/config/`, `src/lib/`, `src/training/` | 8h |

### Week 9–10: Widget SDK & Embedding

| # | Task | Files | Effort |
|---|------|-------|--------|
| 30 | Harden widget embed code generation (proper escaping) | `src/app/admin/components/EmbedCodeGenerator.tsx` | 3h |
| 31 | Add widget origin validation (allowedOrigins config) | `public/widget/chatbot-widget.js` | 4h |
| 32 | Add ESLint configuration and fix all lint errors | New `eslint.config.js` | 4h |
| 33 | Set up CI/CD pipeline (lint + test + build) | New `.github/workflows/ci.yml` | 4h |
| 34 | Add pre-commit hooks (lint, type-check) | `package.json`, `.husky/` | 2h |
| 35 | Document API endpoints (OpenAPI/Swagger) | New `docs/` | 8h |

---

## 8. File-by-File Findings

### Engine Core

| File | Lines | Severity | Findings |
|------|------:|----------|----------|
| `services/engine/src/server.ts` | 71 | 🟡 | L67: Redundant `console.log` alongside `logger.info()`. No graceful shutdown handler (`process.on('SIGTERM')`). |
| `services/engine/src/core/engine.ts` | 83 | 🟢 | Clean orchestrator. L30: `initialize()` called on every message (guarded but unnecessary overhead). L68–77: Learning errors silently caught — good fire-and-forget, but should still log at warn level. |
| `services/engine/src/core/constants.ts` | 17 | 🟢 | Well-structured. Missing `LEARNING_CONFIDENCE_THRESHOLD` and `AUTO_LEARN_PROCESS_INTERVAL` constants referenced by learning service (defined in compiled dist only). |
| `services/engine/src/core/nlp/nlp-service.ts` | 139 | 🟡 | L42: Dynamic import path `@/training/groups/${this.corpusFile}` — potential path traversal if `corpusFile` is user-controlled. L60: `any` type on NLP result. L49–50: No error handling if corpus is malformed. |
| `services/engine/src/core/nlp/fuzzy-matcher.ts` | ~50 | 🟡 | L39: Fuse.js threshold `0.4` hardcoded instead of using constant. L47: Returns null without logging. L53: Non-null assertion on score. |
| `services/engine/src/core/nlp/date-entity-extractor.ts` | ~55 | 🟢 | L54: `break` after first match means multi-date messages only extract first date. L25: `parseInt(m[2]) - 1` could produce negative index. |
| `services/engine/src/core/api-connector/api-client.ts` | 128 | 🟡 | L11: Cache typed as `any`. L42, 77, 108: 30s timeout hardcoded (should be configurable). No retry logic. L51: `as T` type assertion without validation — response shape not verified. |
| `services/engine/src/core/api-connector/bam-auth.ts` | ~80 | 🟡 | L56: Forward headers spread without sanitizing — could forward internal headers. L69: Only checks `!data.bamToken` but doesn't validate format. 5-min cache may exceed token lifetime. |
| `services/engine/src/core/api-connector/csv-analyzer.ts` | ~420 | 🟡 | L28: `rows[0]` accessed without length check. L48–50: Numeric type assertion without NaN guard. L87: Division by zero possible. L199, 228: Duplicated parsing logic. No row limit — large CSVs could exhaust memory. |
| `services/engine/src/core/api-connector/document-search.ts` | ~110 | 🟢 | Basic keyword frequency scoring. No TF-IDF or relevance weighting. L46: Overlapping occurrence counting. |
| `services/engine/src/core/api-connector/query-service.ts` | 544 | 🟡 | L409–411: Path traversal check uses `process.cwd()` which can be unreliable in containers. L429–434: `Promise.allSettled` hides individual errors. L119: Fire-and-forget stats recording with `.catch(() => {})`. |
| `services/engine/src/core/api-connector/types.ts` | ~55 | 🟢 | Good Zod schema usage. L22: Implicit string-to-FilterBinding transform. L49: `z.record(z.string(), z.unknown())` is too loose for API results. |
| `services/engine/src/core/response/response-generator.ts` | 1,358 | 🟡 | **Monolithic.** 40+ methods in one class. L411–418: Stop words hardcoded and duplicated at L1265. L622: Random template selection is non-deterministic for testing. L794: Fragile regex for filter extraction. L861: Mutates shared context object in-place. |
| `services/engine/src/core/response/templates.ts` | ~40 | 🟢 | No i18n support. Help text includes markdown — assumes frontend renders it. |
| `services/engine/src/core/session/session-manager.ts` | 54 | 🟡 | No max session cap — unbounded memory growth. L12: `setInterval` cleanup never cleared (destroy() never called). No persistence — sessions lost on restart. |
| `services/engine/src/core/learning/learning-service.ts` | ~300 | 🟡 | L63–64: Synchronous file I/O. L132: Silent error swallowing. L183: Confidence bucket logic assumes 0–1 range without validation. Missing constants (hardcoded in dist only). |
| `services/engine/src/core/learning/signal-processor.ts` | ~85 | 🟡 | L65: Mutates corpus JSON in-place — could corrupt if write fails. L78: Path resolution uses `process.cwd()`. L81: Fallback path assumes source directory structure. |

### Engine Infrastructure

| File | Lines | Severity | Findings |
|------|------:|----------|----------|
| `services/engine/src/middleware/auth.ts` | 111 | 🔴 | L53: Timing-attack vulnerable string comparison. L100: `req.ip` could be undefined. L103: `allowedIps.includes('*')` bypasses all checks if wildcard configured. |
| `services/engine/src/routes/admin.ts` | 693 | 🟡 | **Monolithic.** L575, 585: File path sanitization insufficient. L107: Empty catch block. L240–241: Fragile ID generation parsing. L458–460: Reads entire log file into memory. L473–474: O(n²) intent count computation. |
| `services/engine/src/routes/chat.ts` | ~80 | 🟢 | L30: Default platform 'web' hardcoded. L41–42: Feedback signals added without validation. L63–74: Conversation logging in plaintext. |
| `services/engine/src/routes/health.ts` | 13 | 🟡 | No readiness check (NLP model loaded? APIs reachable?). L10: `process.uptime()` exposed. |
| `services/engine/src/routes/queries.ts` | ~45 | 🟡 | L16: `ApiClient` created per request — should be pooled. L38–39: No validation filter-config.json exists. |
| `services/engine/src/routes/stats.ts` | ~95 | 🟡 | L92: ID generation `Date.now() + random` not truly unique. L60: Sorting assumes numeric values. No authorization check. |
| `services/engine/src/routes/user.ts` | ~75 | 🟢 | L62–75: Hardcoded demo user data. L29: Suspicious type cast. |
| `services/engine/src/lib/config.ts` | ~20 | 🟡 | Hardcoded default URLs. Missing env vars default to empty strings (no validation). |
| `services/engine/src/lib/errors.ts` | ~30 | 🟢 | Good error hierarchy. Errors could leak internal details to HTTP responses. |
| `services/engine/src/lib/generate-id.ts` | ~25 | 🟡 | L18–22: Fallback UUID uses `Math.random()` — not cryptographically secure. |
| `services/engine/src/lib/logger.ts` | ~15 | 🟢 | Pino configured properly. No sensitive data masking. No log rotation. |
| `services/engine/src/lib/singleton.ts` | ~25 | 🟡 | Unbounded Map of engines — leaks if groups are frequently created/deleted. |
| `services/engine/src/lib/onboard/onboard-service.ts` | ~120 | 🟡 | L27–37, 80–106: Race condition on file read/write. No rollback on partial failure. L81–84: ID generation duplicated from admin.ts. |

### Next.js API Routes

| File | Lines | Severity | Findings |
|------|------:|----------|----------|
| `src/app/api/admin/files/route.ts` | ~80 | 🔴 | Path traversal vulnerability. Missing admin auth check on all handlers. |
| `src/app/api/admin/files/read/route.ts` | ~20 | 🔴 | Path traversal on file read. Missing admin auth check. |
| `src/app/api/admin/queries/route.ts` | ~100 | 🟡 | Uses `withDbLock` for safe writes. No input length/format validation on query fields. |
| `src/app/api/admin/templates/route.ts` | ~70 | 🟡 | Regex-based TypeScript parser (L19–43) is fragile and could fail on edge cases. |
| `src/app/api/admin/groups/create/route.ts` | ~30 | 🟡 | Group ID validation (`/^[a-z0-9_]+$/`) doesn't check length or reserved names. |
| `src/app/api/admin/logs/route.ts` | ~40 | 🟡 | L29: `JSON.parse(line)` without try-catch — corrupted log line crashes entire API. |
| `src/app/api/stats/route.ts` | ~100 | 🟡 | No authorization on stats recording. Uses `withDbLock` for safe writes. |
| `src/app/api/chat/route.ts` | ~60 | 🟡 | No rate limiting in monolith mode. |
| `src/app/api/health/route.ts` | 6 | 🟢 | Minimal health check — no readiness verification. |

### React Components & Hooks

| File | Lines | Severity | Findings |
|------|------:|----------|----------|
| `src/components/chat/ChatWindow.tsx` | 108 | 🟡 | L25: `postMessage('*')` broadcasts to all origins. No Error Boundary wrapping child components. |
| `src/components/chat/MessageBubble.tsx` | 596 | 🟡 | Renders 11 rich content types in one component — should be split. L146: `as UrlItem[]` unsafe cast. |
| `src/components/chat/DataChart.tsx` | ~210 | 🟢 | Good `useMemo` usage. Chart data labels from API not sanitized (low risk — recharts handles it). |
| `src/components/chat/QueryFilterForm.tsx` | ~100 | 🟢 | Module-level cache for filter config. Date value defaults are sensible. |
| `src/hooks/useChat.ts` | 325 | 🟡 | L42–44: Session ID generated client-side. L106: Hardcoded confidence threshold `0.8`. L63–64: Silent catch on query fetch failure. |
| `src/app/admin/groups/[id]/page.tsx` | 891 | 🟡 | Monolithic page. Success message fixed recently. Source dropdown prevents invalid values. |
| `src/app/admin/learning/page.tsx` | ~310 | 🟢 | Three-tab layout (Review/Auto-Learned/Stats) well-structured. Table column spacing recently improved. |
| `src/contexts/UserContext.tsx` | ~75 | 🟢 | L66–74: Hardcoded dev fallback user data. Admin check independent of user fetch — could be inconsistent. |
| `public/widget/chatbot-widget.js` | 137 | 🟡 | SVG icons injected via innerHTML (L62, 106). Config values from embedding page not validated. |

### Configuration & Training Data

| File | Severity | Findings |
|------|----------|----------|
| `services/engine/src/config/groups.json` | 🟢 | Well-structured. Corpus/FAQ file paths not verified to exist. |
| `services/engine/src/config/users.json` | 🟡 | Passwords stored in plaintext JSON. No hashing. |
| `services/engine/src/config/settings.json` | 🟢 | Reasonable defaults. |
| `services/engine/src/training/corpus.json` | 🟢 | Good intent/utterance variety. Per-group corpora properly isolated. |
| `mock-api/db.json` | 🟢 | Sample data for demo. Race condition with concurrent writes (mitigated by `withDbLock`). |
| `.env.example` | 🟢 | No secrets. Good documentation comments. |
| `.gitignore` | 🟢 | Properly ignores `.env*` files (except `.env.example`). |
| `Dockerfile` | 🟢 | Multi-stage build, non-root user, minimal image. Missing `HEALTHCHECK` directive. |
| `docker-compose.yml` | 🟡 | No `healthcheck` blocks. No volume mounts for persistent data. Engine API key not set (demo mode). |

---

## Appendix: Positive Findings

Not everything is a gap. The following architectural decisions are solid:

1. **Per-group NLP models** — Each bot group trains its own corpus (`corpus-finance.json`, `corpus-analytics.json`), preventing cross-tenant intent leakage.
2. **Adapter pattern** — Clean `BotAdapter` interface with web/widget/teams implementations allows new channels without modifying core logic.
3. **LRU caching on API calls** — `ApiClient` uses proper LRU cache with configurable TTL.
4. **Zod schema validation** — Query definitions validated with Zod schemas (could be expanded to more inputs).
5. **Structured logging with Pino** — JSON logging with context (intent, confidence, entities) enables proper observability.
6. **Learning pipeline** — Review queue, auto-learn with signal thresholds, and corpus integration is well-designed.
7. **Rate limiting on engine** — `express-rate-limit` configured on both chat (100/min) and admin (30/min) endpoints.
8. **Multi-stage Docker build** — Minimal production image with non-root user.
9. **Environment-based configuration** — Separate `.env.mock`, `.env.dev`, `.env.prod` files with `.env.example` documentation.
10. **Rich response types** — 11 content types (table, chart, card, suggestions, URL list, etc.) provide good UX.

---

---

## Appendix: Post-Audit Improvements (2026-03-16)

The following improvements were made after the initial audit:

### Performance Optimizations
1. **Bundle analyzer** added (`@next/bundle-analyzer`) — `npm run analyze` for interactive treemap
2. **Recharts code-split** via `React.lazy()` + `<Suspense>` — removes ~150KB from initial bundle
3. **XLSX lazy-loaded** in both frontend (6 files) and backend (3 files) — removes ~700KB from startup
4. **esbuild backend bundler** — 25ms build, 357KB single-file output (was 69 files, 1.4MB, ~3s via tsc)
5. **Next.js production config** — `output: 'standalone'`, `removeConsole` for production builds

### Developer Experience
6. **Storybook 8** setup with `@storybook/nextjs` — 12+ component stories across Chat, Dashboard, and Common categories
7. **New npm scripts** — `build:prod`, `start:all`, `analyze`, `storybook`, `build:storybook`
8. **Engine type-checking** separated from build — `npm run build:typecheck` for `tsc --noEmit`

### ML Features Added
9. **Semantic search** — TF-IDF + cosine similarity for natural language query discovery
10. **ML-enhanced recommendations** — collaborative filtering, time patterns, user clustering
11. **Anomaly detection** — z-score/IQR monitoring on query results with admin dashboard

### Resolved Findings
- ✅ 5.5 React Error Boundary — `ErrorBoundary.tsx` added with Storybook stories
- ✅ 5.7 ESLint config — `eslint.config.mjs` with Next.js + TypeScript rules

*Post-audit update: 2026-03-16*

---

*End of audit report. Generated 2026-03-12.*
