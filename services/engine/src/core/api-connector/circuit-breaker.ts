import { logger } from '@/lib/logger';
import { CircuitOpenError } from '@/lib/errors';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit. Default: 5 */
  failureThreshold?: number;
  /** Milliseconds to wait before transitioning from OPEN to HALF_OPEN. Default: 30_000 */
  cooldownMs?: number;
}

interface CircuitEntry {
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureTime: number;
}

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private circuits = new Map<string, CircuitEntry>();

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.cooldownMs = options?.cooldownMs ?? 30_000;
  }

  /**
   * Check whether a request to the given base URL is allowed.
   * Throws CircuitOpenError if the circuit is OPEN and the cooldown has not elapsed.
   * Returns the current state so callers know if this is a HALF_OPEN probe.
   */
  check(baseUrl: string): CircuitState {
    const entry = this.getOrCreate(baseUrl);

    if (entry.state === CircuitState.CLOSED) {
      return CircuitState.CLOSED;
    }

    if (entry.state === CircuitState.OPEN) {
      const elapsed = Date.now() - entry.lastFailureTime;
      if (elapsed >= this.cooldownMs) {
        entry.state = CircuitState.HALF_OPEN;
        logger.info(
          { baseUrl, cooldownMs: this.cooldownMs },
          'Circuit breaker OPEN -> HALF_OPEN (cooldown elapsed)'
        );
        return CircuitState.HALF_OPEN;
      }
      throw new CircuitOpenError(baseUrl);
    }

    // HALF_OPEN — allow a single probe request
    return CircuitState.HALF_OPEN;
  }

  /** Record a successful response for the given base URL. */
  onSuccess(baseUrl: string): void {
    const entry = this.getOrCreate(baseUrl);
    if (entry.state === CircuitState.HALF_OPEN) {
      logger.info({ baseUrl }, 'Circuit breaker HALF_OPEN -> CLOSED (success)');
    }
    entry.state = CircuitState.CLOSED;
    entry.consecutiveFailures = 0;
  }

  /** Record a failed response for the given base URL. */
  onFailure(baseUrl: string): void {
    const entry = this.getOrCreate(baseUrl);
    entry.consecutiveFailures += 1;
    entry.lastFailureTime = Date.now();

    if (entry.state === CircuitState.HALF_OPEN) {
      entry.state = CircuitState.OPEN;
      logger.warn({ baseUrl }, 'Circuit breaker HALF_OPEN -> OPEN (probe failed)');
      return;
    }

    if (
      entry.state === CircuitState.CLOSED &&
      entry.consecutiveFailures >= this.failureThreshold
    ) {
      entry.state = CircuitState.OPEN;
      logger.warn(
        { baseUrl, consecutiveFailures: entry.consecutiveFailures },
        'Circuit breaker CLOSED -> OPEN (failure threshold reached)'
      );
    }
  }

  /** Get the current state for a base URL (mainly for testing / logging). */
  getState(baseUrl: string): CircuitState {
    return this.getOrCreate(baseUrl).state;
  }

  /** Reset a circuit back to CLOSED (useful in tests). */
  reset(baseUrl: string): void {
    this.circuits.delete(baseUrl);
  }

  private getOrCreate(baseUrl: string): CircuitEntry {
    let entry = this.circuits.get(baseUrl);
    if (!entry) {
      entry = {
        state: CircuitState.CLOSED,
        consecutiveFailures: 0,
        lastFailureTime: 0,
      };
      this.circuits.set(baseUrl, entry);
    }
    return entry;
  }
}
