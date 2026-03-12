import { LRUCache } from 'lru-cache';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { ApiConnectionError } from '@/lib/errors';
import { API_CACHE_TTL_MS } from '../constants';
import { timeoutSignal } from '@/lib/generate-id';

export class ApiClient {
  private baseUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache: LRUCache<string, any>;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || config.apiBaseUrl).replace(/\/?$/, '/');

    this.cache = new LRUCache({
      max: 500,
      ttl: API_CACHE_TTL_MS,
    });
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiToken) {
      headers['Authorization'] = `Bearer ${config.apiToken}`;
    }
    return headers;
  }

  async get<T>(path: string, options?: { cacheTtl?: number; authHeaders?: Record<string, string> }): Promise<T> {
    const cacheKey = `GET:${path}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached as T;

    const url = `${this.baseUrl}${path}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { ...this.buildHeaders(), ...options?.authHeaders },
        signal: timeoutSignal(30_000),
      });

      logger.debug({ url, status: response.status }, 'API response');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as T;
      this.cache.set(cacheKey, data, { ttl: options?.cacheTtl });
      return data;
    } catch (error) {
      logger.error({ error, path, url }, 'API GET request failed');
      throw new ApiConnectionError(`Failed to fetch ${path}`);
    }
  }

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
      const response = await fetch(url, {
        method: 'POST',
        headers: { ...this.buildHeaders(), ...authHeaders },
        body: JSON.stringify(body),
        signal: timeoutSignal(30_000),
      });

      logger.debug({ url, status: response.status }, 'API response');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (error) {
      logger.error({ error, path, url }, 'API POST request failed');
      throw new ApiConnectionError(`Failed to post to ${path}`);
    }
  }

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
      const response = await fetch(absoluteUrl, {
        method,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: timeoutSignal(30_000),
      });

      logger.debug({ url: absoluteUrl, status: response.status }, 'API response (absolute)');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (error) {
      logger.error({ error, url: absoluteUrl }, 'API request (absolute) failed');
      throw new ApiConnectionError(`Failed to fetch ${absoluteUrl}`);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
