import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Rate-limit store (in-memory, per-process)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Periodically purge expired entries so the Map doesn't grow unbounded.
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanupRateLimitMap() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  });
}

/** Returns `true` if the request is within the allowed window. */
function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupRateLimitMap();

  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    // First request or window expired — start a fresh window.
    const resetAt = now + windowMs;
    rateLimitMap.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.ip ||
    "127.0.0.1"
  );
}

function addSecurityHeaders(
  response: NextResponse,
  request: NextRequest,
): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // Only add HSTS on non-localhost origins (i.e. production).
  const hostname = request.nextUrl.hostname;
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
}

// ---------------------------------------------------------------------------
// Rate-limit configuration per route prefix
// ---------------------------------------------------------------------------

const RATE_LIMIT_RULES: { prefix: string; max: number; windowMs: number }[] = [
  { prefix: "/api/chat", max: 300, windowMs: 60_000 },
  { prefix: "/api/onboard", max: 10, windowMs: 60_000 },
];

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Skip health-check endpoints ----
  if (pathname === "/api/health" || pathname === "/api/healthz") {
    const response = NextResponse.next();
    addSecurityHeaders(response, request);
    return response;
  }

  // ---- Rate limiting on chat / onboard routes ----
  for (const rule of RATE_LIMIT_RULES) {
    if (pathname.startsWith(rule.prefix)) {
      const ip = getClientIp(request);
      const key = `${rule.prefix}:${ip}`;
      const { allowed, remaining, resetAt } = checkRateLimit(
        key,
        rule.max,
        rule.windowMs,
      );

      if (!allowed) {
        // eslint-disable-next-line no-console
        console.warn(
          `[middleware] Rate limit exceeded: route=${rule.prefix} limit=${rule.max}/min`,
        );
        const res = NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 },
        );
        res.headers.set(
          "Retry-After",
          String(Math.ceil((resetAt - Date.now()) / 1000)),
        );
        addSecurityHeaders(res, request);
        return res;
      }

      // Attach rate-limit info headers on successful requests too.
      const response = NextResponse.next();
      response.headers.set("X-RateLimit-Limit", String(rule.max));
      response.headers.set("X-RateLimit-Remaining", String(remaining));
      addSecurityHeaders(response, request);
      return response;
    }
  }

  // ---- CSRF protection for state-changing admin API requests ----
  const isAdminApi = pathname.startsWith("/api/admin");
  const isStateChanging = ["POST", "PATCH", "PUT", "DELETE"].includes(
    request.method,
  );

  if (isAdminApi && isStateChanging) {
    // Allow engine-to-UI calls that carry the internal API key.
    const engineKey = request.headers.get("x-engine-api-key");
    if (!engineKey) {
      const csrfHeader = request.headers.get("x-csrf-token");
      const csrfCookie = request.cookies.get("csrf-token")?.value;

      if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
        // eslint-disable-next-line no-console
        console.warn(
          `[middleware] CSRF validation failed: path=${pathname} method=${request.method}`,
        );
        const res = NextResponse.json(
          { error: "Invalid or missing CSRF token." },
          { status: 403 },
        );
        addSecurityHeaders(res, request);
        return res;
      }
    }
  }

  // ---- Set CSRF cookie on GET requests to admin pages (if not already set) ----
  const isAdminPage = pathname.startsWith("/admin");
  if (request.method === "GET" && isAdminPage) {
    const existing = request.cookies.get("csrf-token")?.value;
    if (!existing) {
      const token = crypto.randomUUID();
      const response = NextResponse.next();
      response.cookies.set("csrf-token", token, {
        httpOnly: false, // JS needs to read this to send the header
        sameSite: "strict",
        secure: request.nextUrl.protocol === "https:",
        path: "/",
      });
      addSecurityHeaders(response, request);
      return response;
    }
  }

  // ---- Default: just add security headers ----
  const response = NextResponse.next();
  addSecurityHeaders(response, request);
  return response;
}

// ---------------------------------------------------------------------------
// Matcher — only run middleware on API routes and admin pages
// ---------------------------------------------------------------------------

export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};
