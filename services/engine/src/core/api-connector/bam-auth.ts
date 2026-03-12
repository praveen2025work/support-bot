import { LRUCache } from 'lru-cache';
import { logger } from '@/lib/logger';
import { ApiConnectionError } from '@/lib/errors';
import { timeoutSignal } from '@/lib/generate-id';

/**
 * BAM (Business Application Module) Authentication
 *
 * BAM auth is a two-step process:
 * 1. Call the BAM token URL to get a short-lived token
 * 2. Use that token (X-BAM-Token header) when calling the actual data API
 *
 * The BAM token response also includes a `redirectURL` which can optionally
 * override the query's configured endpoint.
 */

export interface BamTokenResponse {
  code: string;
  message: string;
  bamToken: string;
  redirectURL: string;
}

// Cache BAM tokens for 5 minutes to avoid re-fetching per query
const bamTokenCache = new LRUCache<string, BamTokenResponse>({
  max: 50,
  ttl: 5 * 60 * 1000, // 5 minutes
});

/**
 * Fetch a BAM token from the given URL.
 * Results are cached by URL for 5 minutes.
 *
 * @param bamTokenUrl - The BAM authentication endpoint
 * @param forwardHeaders - Optional headers to forward (e.g., user's cookies for SSO)
 * @returns BAM token response with token and redirect URL
 */
export async function fetchBamToken(
  bamTokenUrl: string,
  forwardHeaders?: Record<string, string>
): Promise<BamTokenResponse> {
  // Check cache first
  const cached = bamTokenCache.get(bamTokenUrl);
  if (cached) {
    logger.debug({ bamTokenUrl }, 'BAM token cache hit');
    return cached;
  }

  logger.info({ bamTokenUrl }, 'Fetching BAM token');

  try {
    const response = await fetch(bamTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...forwardHeaders,
      },
      body: JSON.stringify({}),
      signal: timeoutSignal(15_000), // 15s timeout for token fetch
    });

    if (!response.ok) {
      throw new Error(`BAM token request failed: HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as BamTokenResponse;

    // Validate response shape
    if (!data.bamToken) {
      throw new Error('BAM token response missing bamToken field');
    }

    if (data.code !== 'success') {
      throw new Error(`BAM token request returned code: ${data.code}, message: ${data.message}`);
    }

    // Cache the token
    bamTokenCache.set(bamTokenUrl, data);
    logger.info({ bamTokenUrl, hasRedirectURL: !!data.redirectURL }, 'BAM token acquired');

    return data;
  } catch (error) {
    logger.error({ error, bamTokenUrl }, 'BAM token fetch failed');
    throw new ApiConnectionError(`Failed to fetch BAM token from ${bamTokenUrl}`);
  }
}

/**
 * Invalidate a cached BAM token (e.g., on 401 retry).
 */
export function invalidateBamToken(bamTokenUrl: string): void {
  bamTokenCache.delete(bamTokenUrl);
}

/**
 * Clear all cached BAM tokens.
 */
export function clearBamTokenCache(): void {
  bamTokenCache.clear();
}
