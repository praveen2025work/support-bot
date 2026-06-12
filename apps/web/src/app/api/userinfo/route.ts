import { NextRequest, NextResponse } from "next/server";
import { timeoutSignal } from "@/lib/generate-id";
import type { UserInfo } from "@/types/user-types";

/**
 * GET /api/userinfo — fetch the calling user's AD identity.
 *
 * Deployment topology (passthrough auth, recommended):
 *   Browser ── Negotiate/NTLM ──> IIS/nginx/proxy ── auth headers ──>
 *     Node (this route) ── forward headers ──> USER_INFO_URL
 *
 * IIS or the front proxy terminates the Windows auth handshake and
 * either drops a session cookie or sets a header like X-Forwarded-User
 * / Remote-User on the request reaching Node. We forward whichever
 * auth-relevant headers are present so the upstream AD endpoint can
 * identify the caller.
 *
 * Env:
 *   USER_INFO_URL                 — full AD endpoint URL. Empty = dev fallback.
 *   USER_INFO_DEV_OVERRIDE_SAM    — local-only: skip the upstream call,
 *                                   return a synthetic user keyed on this
 *                                   samAccountName. Lets developers test
 *                                   role flows without IIS.
 *
 * Failure modes:
 *   - URL not set                    → DEV_FALLBACK_USER (works for `npm run dev`)
 *   - URL set, upstream non-2xx      → in dev: fallback; in prod: same status
 *   - URL set, upstream unreachable  → in dev: fallback; in prod: 502
 */

const DEV_FALLBACK_USER: UserInfo = {
  samAccountName: "local_dev",
  userName: "local_dev",
  description: "Local Developer (dev fallback)",
  displayName: "Local Developer",
  distinguishedName: "CN=Local Developer,OU=Dev,DC=local",
  emailAddress: "dev@localhost",
  employeeId: "EMP-LOCAL",
  name: "Local Developer",
  givenName: "Local",
  middleName: null,
  surname: "Developer",
  domain: null,
  department: "Development",
  location: "Local",
};

/**
 * Auth-relevant headers we pass to the AD endpoint. The Negotiate
 * handshake is multi-round; in the supported topology IIS/proxy
 * terminates it, so what reaches us is usually a session cookie or a
 * principal header. We forward all common variants — the upstream
 * endpoint ignores anything it doesn't use.
 */
const FORWARD_HEADERS = [
  "authorization",
  "cookie",
  "x-forwarded-user",
  "x-forwarded-for",
  "x-iis-user",
  "x-remote-user",
  "remote-user",
  "x-user-principal-name",
] as const;

function buildSyntheticUser(sam: string): UserInfo {
  const safe = sam.replace(/[^a-zA-Z0-9._-]/g, "");
  return {
    samAccountName: safe,
    userName: safe,
    displayName: safe,
    emailAddress: `${safe}@dev.local`,
    employeeId: `DEV-${safe.toUpperCase()}`,
    name: safe,
    givenName: safe,
    middleName: null,
    surname: "(dev)",
    domain: null,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Local override — short-circuits the network call entirely.
  const devOverride = process.env.USER_INFO_DEV_OVERRIDE_SAM;
  if (devOverride && process.env.NODE_ENV !== "production") {
    return NextResponse.json(buildSyntheticUser(devOverride));
  }

  const userInfoUrl = process.env.USER_INFO_URL;
  if (!userInfoUrl) {
    // No upstream configured — dev fallback so the UI still renders.
    return NextResponse.json(DEV_FALLBACK_USER);
  }

  // Forward auth-relevant headers from the incoming request. The
  // request received here came from the browser through whatever proxy
  // terminated Windows auth, so it already carries the auth artifacts
  // (cookie or principal header).
  const outgoing: Record<string, string> = { Accept: "application/json" };
  for (const name of FORWARD_HEADERS) {
    const v = request.headers.get(name);
    if (v) outgoing[name] = v;
  }

  try {
    const response = await fetch(userInfoUrl, {
      method: "GET",
      headers: outgoing,
      signal: timeoutSignal(10_000),
      // `credentials` is irrelevant server-side; the explicit Cookie
      // forward above is what matters.
    });

    if (!response.ok) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[userinfo] upstream returned ${response.status}; using dev fallback`,
        );
        return NextResponse.json(DEV_FALLBACK_USER);
      }
      return NextResponse.json(
        { error: "Failed to fetch user info" },
        { status: response.status },
      );
    }

    const data: UserInfo = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[userinfo] upstream unreachable (${(err as Error).message}); using dev fallback`,
      );
      return NextResponse.json(DEV_FALLBACK_USER);
    }
    return NextResponse.json(
      { error: "User info service unavailable" },
      { status: 502 },
    );
  }
}
