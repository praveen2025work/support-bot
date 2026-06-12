/**
 * Process lifecycle state shared between the HTTP server and the
 * health routes.
 *
 * During graceful shutdown the server flips `draining` to true so the
 * readiness probe (`/api/health/ready`) starts reporting 503. Load
 * balancers observe that and stop routing new traffic ~DRAIN_MS before
 * the server actually closes connections — letting in-flight requests
 * finish instead of being cut mid-flight.
 *
 * Liveness (`/api/health/live`) deliberately ignores this flag: a
 * draining instance is still alive and should NOT be restarted by an
 * orchestrator; it's just no longer accepting new work.
 */

let draining = false;

export function setDraining(value: boolean): void {
  draining = value;
}

export function isDraining(): boolean {
  return draining;
}
