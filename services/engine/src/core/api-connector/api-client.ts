import { LRUCache } from 'lru-cache';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { ApiConnectionError } from '@/lib/errors';
import { API_CACHE_TTL_MS } from '../constants';

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

  async get<T>(path: string, options?: { cacheTtl?: number }): Promise<T> {
    const cacheKey = `GET:${path}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached as T;

    const url = `${this.baseUrl}${path}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: AbortSignal.timeout(30_000),
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

  async post<T>(path: string, body: unknown, params?: Record<string, string>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params).toString();
      url = `${url}?${qs}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
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

  clearCache(): void {
    this.cache.clear();
  }
}
