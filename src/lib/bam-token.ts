/**
 * BAM token client manager (browser-only).
 *
 * Windows Integrated Auth can only be performed by the browser — only it
 * carries the user's Windows identity. This module mints a BAM token by
 * POSTing to the per-application token URL with `credentials: 'include'`,
 * which triggers the browser's Windows handshake. The minted token is then
 * attached to chat requests as the `X-BAM-Token` header.
 *
 * There is ONE token URL per application, so we mint at most ONE token per
 * URL and reuse it. Concurrent callers share a single in-flight request
 * (de-duplication), and successful results are cached for ~5 minutes.
 */

/** Successful token-endpoint response shape (per the fixed contract). */
interface BamTokenResponse {
  code: string;
  message: string;
  bamToken: string;
  redirectURL: string;
}

/** A cached, minted token with its expiry timestamp (epoch ms). */
interface CachedToken {
  token: string;
  expiresAt: number;
}

/** Cache lifetime for a minted token (~5 minutes). */
const TOKEN_TTL_MS = 5 * 60 * 1000;

// Module-level state, keyed by token URL. Persists for the lifetime of the
// page so a token is reused across every query/request.
const tokenCache = new Map<string, CachedToken>();
const inFlight = new Map<string, Promise<string>>();

/**
 * Parse and validate a token-endpoint response body. Throws a clear Error
 * when the contract is violated (non-success code or missing token).
 */
function parseTokenResponse(body: unknown): string {
  if (typeof body !== "object" || body === null) {
    throw new Error("BAM token endpoint returned a non-object response");
  }
  const data = body as Partial<BamTokenResponse>;
  const codeOk = String(data.code ?? "").toLowerCase() === "success";
  if (!codeOk) {
    throw new Error(
      `BAM token request was not successful (code: ${String(data.code)})`,
    );
  }
  const token = data.bamToken;
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("BAM token endpoint response did not include a bamToken");
  }
  return token;
}

/** Perform the actual mint request against the token URL. */
async function mintToken(bamTokenUrl: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(bamTokenUrl, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "network error";
    throw new Error(`BAM token request failed: ${reason}`);
  }

  if (!res.ok) {
    throw new Error(
      `BAM token request failed with HTTP ${res.status} ${res.statusText}`,
    );
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error("BAM token endpoint returned an invalid JSON body");
  }

  return parseTokenResponse(body);
}

/**
 * Get a BAM token for the given token URL.
 *
 * Returns a cached token when one is still valid, de-duplicates concurrent
 * mint requests for the same URL, and caches successful results for ~5
 * minutes. Throws a clear Error when minting fails or the response violates
 * the contract.
 */
export async function getBamToken(bamTokenUrl: string): Promise<string> {
  if (!bamTokenUrl) {
    throw new Error("getBamToken requires a non-empty bamTokenUrl");
  }

  const cached = tokenCache.get(bamTokenUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const existing = inFlight.get(bamTokenUrl);
  if (existing) {
    return existing;
  }

  const request = mintToken(bamTokenUrl)
    .then((token) => {
      tokenCache.set(bamTokenUrl, {
        token,
        expiresAt: Date.now() + TOKEN_TTL_MS,
      });
      return token;
    })
    .finally(() => {
      inFlight.delete(bamTokenUrl);
    });

  inFlight.set(bamTokenUrl, request);
  return request;
}

/**
 * Clear a cached BAM token. Pass a URL to clear just that entry, or omit it
 * to clear every cached token. Call this after a 401 so the next request
 * re-mints a fresh token.
 */
export function clearBamToken(url?: string): void {
  if (url) {
    tokenCache.delete(url);
    inFlight.delete(url);
    return;
  }
  tokenCache.clear();
  inFlight.clear();
}
