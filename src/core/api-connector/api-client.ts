import ky, { KyInstance } from 'ky';
import { LRUCache } from 'lru-cache';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { ApiConnectionError } from '@/lib/errors';
import { API_CACHE_TTL_MS } from '../constants';

export class ApiClient {
  private client: KyInstance;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache: LRUCache<string, any>;

  constructor(baseUrl?: string) {
    this.client = ky.create({
      prefixUrl: (baseUrl || config.apiBaseUrl).replace(/\/?$/, '/'),
      timeout: 30_000,
      retry: { limit: 2, methods: ['get'] },
      hooks: {
        beforeRequest: [
          (request) => {
            if (config.apiToken) {
              request.headers.set('Authorization', `Bearer ${config.apiToken}`);
            }
            request.headers.set('Content-Type', 'application/json');
          },
        ],
        afterResponse: [
          (_request, _options, response) => {
            logger.debug(
              { url: response.url, status: response.status },
              'API response'
            );
          },
        ],
      },
    });

    this.cache = new LRUCache({
      max: 500,
      ttl: API_CACHE_TTL_MS,
    });
  }

  async get<T>(path: string, options?: { cacheTtl?: number }): Promise<T> {
    const cacheKey = `GET:${path}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached as T;

    try {
      const data = await this.client.get(path).json<T>();
      this.cache.set(cacheKey, data, { ttl: options?.cacheTtl });
      return data;
    } catch (error) {
      logger.error({ error, path }, 'API GET request failed');
      throw new ApiConnectionError(`Failed to fetch ${path}`);
    }
  }

  async post<T>(path: string, body: unknown, params?: Record<string, string>): Promise<T> {
    try {
      let url = path;
      if (params && Object.keys(params).length > 0) {
        const qs = new URLSearchParams(params).toString();
        url = `${path}?${qs}`;
      }
      return await this.client.post(url, { json: body }).json<T>();
    } catch (error) {
      logger.error({ error, path }, 'API POST request failed');
      throw new ApiConnectionError(`Failed to post to ${path}`);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
