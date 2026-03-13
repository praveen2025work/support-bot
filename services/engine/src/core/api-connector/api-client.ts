import { LRUCache } from 'lru-cache';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { ApiConnectionError } from '@/lib/errors';
import { API_CACHE_TTL_MS } from '../constants';
import { timeoutSignal } from '@/lib/generate-id';
import { CircuitBreaker, CircuitState } from './circuit-breaker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiClientOptions {
  /** Request timeout in milliseconds. Default: 30 000 */
  timeoutMs?: number;
  /** Maximum number of retry attempts for retryable errors. Default: 3 */
  maxRetries?: number;
  /** Base delay (ms) for exponential backoff. Default: 1 000 */
  retryBaseDelayMs?: number;
  /** Circuit breaker consecutive-failure threshold. Default: 5 */
  circuitBreakerThreshold?: number;
  /** Circuit breaker cooldown in ms before HALF_OPEN. Default: 30 000 */
  circuitBreakerCooldownMs?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true for errors that are safe to retry (5xx or network failures). */
function isRetryable(error: unknown): boolean {
  if (error instanceof HttpStatusError) {
    return error.status >= 500;
  }
  // Network / timeout / DNS failures — retry
  return true;
}

/** Sleep for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Compute delay with full-jitter exponential backoff. */
function backoffDelay(attempt: number, baseMs: number): number {
  const exponential = baseMs * Math.pow(2, attempt);
  // Full jitter: random value in [0, exponential]
  return Math.round(Math.random() * exponential);
}

/**
 * Lightweight error used internally to carry the HTTP status through the
 * retry logic so we can distinguish 4xx (non-retryable) from 5xx.
 */
class HttpStatusError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'HttpStatusError';
  }
}

// ---------------------------------------------------------------------------
// Shared circuit breaker instance (one per process, keyed by base URL)
// ---------------------------------------------------------------------------

let sharedCircuitBreaker: CircuitBreaker | undefined;

function getCircuitBreaker(opts?: ApiClientOptions): CircuitBreaker {
  if (!sharedCircuitBreaker) {
    sharedCircuitBreaker = new CircuitBreaker({
      failureThreshold: opts?.circuitBreakerThreshold,
      cooldownMs: opts?.circuitBreakerCooldownMs,
    });
  }
  return sharedCircuitBreaker;
}

// ---------------------------------------------------------------------------
// ApiClient
// ---------------------------------------------------------------------------

export class ApiClient {
  private baseUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache: LRUCache<string, any>;
  private timeoutMs: number;
  private maxRetries: number;
  private retryBaseDelayMs: number;
  private circuitBreaker: CircuitBreaker;

  constructor(baseUrl?: string, options?: ApiClientOptions) {
    this.baseUrl = (baseUrl || config.apiBaseUrl).replace(/\/?$/, '/');

    this.cache = new LRUCache({
      max: 500,
      ttl: API_CACHE_TTL_MS,
    });

    this.timeoutMs = options?.timeoutMs ?? 30_000;
    this.maxRetries = options?.maxRetries ?? 3;
    this.retryBaseDelayMs = options?.retryBaseDelayMs ?? 1_000;
    this.circuitBreaker = getCircuitBreaker(options);
  }

  // -----------------------------------------------------------------------
  // Internal: single fetch (no retry, no circuit breaker)
  // -----------------------------------------------------------------------

  private async rawFetch(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const response = await fetch(url, {
      ...init,
      signal: timeoutSignal(this.timeoutMs),
    });

    logger.debug({ url, status: response.status }, 'API response');

    if (!response.ok) {
      throw new HttpStatusError(
        response.status,
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response;
  }

  // -----------------------------------------------------------------------
  // Internal: fetch with retry + exponential backoff
  // -----------------------------------------------------------------------

  private async fetchWithRetry(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.rawFetch(url, init);
      } catch (error) {
        lastError = error;

        const retriesLeft = this.maxRetries - attempt;
        if (retriesLeft <= 0 || !isRetryable(error)) {
          break;
        }

        const delay = backoffDelay(attempt, this.retryBaseDelayMs);
        logger.warn(
          { url, attempt: attempt + 1, maxRetries: this.maxRetries, delayMs: delay, error },
          `Retrying request (attempt ${attempt + 1}/${this.maxRetries})`
        );
        await sleep(delay);
      }
    }

    throw lastError;
  }

  // -----------------------------------------------------------------------
  // Internal: circuit breaker wrapping the retry logic
  // -----------------------------------------------------------------------

  private async request(url: string, init: RequestInit): Promise<Response> {
    // 1. Circuit check — may throw CircuitOpenError
    this.circuitBreaker.check(this.baseUrl);

    try {
      const response = await this.fetchWithRetry(url, init);
      // 2. Success — reset circuit
      this.circuitBreaker.onSuccess(this.baseUrl);
      return response;
    } catch (error) {
      // 3. Failure — record in circuit breaker, then propagate
      this.circuitBreaker.onFailure(this.baseUrl);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // Public helpers
  // -----------------------------------------------------------------------

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiToken) {
      headers['Authorization'] = `Bearer ${config.apiToken}`;
    }
    return headers;
  }

  // -----------------------------------------------------------------------
  // GET
  // -----------------------------------------------------------------------

  async get<T>(path: string, options?: { cacheTtl?: number; authHeaders?: Record<string, string> }): Promise<T> {
    const cacheKey = `GET:${path}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached as T;

    const url = `${this.baseUrl}${path}`;
    try {
      const response = await this.request(url, {
        method: 'GET',
        headers: { ...this.buildHeaders(), ...options?.authHeaders },
      });

      const data = await response.json() as T;
      this.cache.set(cacheKey, data, { ttl: options?.cacheTtl });
      return data;
    } catch (error) {
      logger.error({ error, path, url }, 'API GET request failed');
      throw error instanceof ApiConnectionError
        ? error
        : new ApiConnectionError(`Failed to fetch ${path}`);
    }
  }

  // -----------------------------------------------------------------------
  // POST
  // -----------------------------------------------------------------------

  async post<T>(
    path: string,
    body: unknown,
    params?: Record<string, string>,
    authHeaders?: Record<string, string>
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params).toString();
      url = `${url}?${qs}`;
    }

    try {
      const response = await this.request(url, {
        method: 'POST',
        headers: { ...this.buildHeaders(), ...authHeaders },
        body: JSON.stringify(body),
      });

      return await response.json() as T;
    } catch (error) {
      logger.error({ error, path, url }, 'API POST request failed');
      throw error instanceof ApiConnectionError
        ? error
        : new ApiConnectionError(`Failed to post to ${path}`);
    }
  }

  // -----------------------------------------------------------------------
  // Absolute URL fetch (external endpoints like BAM token)
  // -----------------------------------------------------------------------

  /**
   * Fetch from an absolute URL (not relative to baseUrl).
   * Used for BAM token endpoints and other external URLs.
   */
  async fetchAbsolute<T>(absoluteUrl: string, options?: {
    method?: 'GET' | 'POST';
    body?: unknown;
    headers?: Record<string, string>;
  }): Promise<T> {
    const method = options?.method ?? 'POST';
    try {
      const response = await this.request(absoluteUrl, {
        method,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      return await response.json() as T;
    } catch (error) {
      logger.error({ error, url: absoluteUrl }, 'API request (absolute) failed');
      throw error instanceof ApiConnectionError
        ? error
        : new ApiConnectionError(`Failed to fetch ${absoluteUrl}`);
    }
  }

  // -----------------------------------------------------------------------
  // Cache
  // -----------------------------------------------------------------------

  clearCache(): void {
    this.cache.clear();
  }
}
