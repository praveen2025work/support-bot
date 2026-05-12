/**
 * Lightweight security-headers middleware.
 *
 * Sets the defensive headers that browsers act on without us needing
 * any deps. We intentionally do NOT default-on Content-Security-Policy
 * because the embedded widget loads cross-origin and a wrong CSP
 * would silently break those integrations — operators turn it on
 * per-deployment via the env var below once they've audited their
 * embed targets.
 *
 * What we DO turn on by default:
 *   - X-Content-Type-Options: nosniff
 *       Prevents browsers from interpreting a JSON response as HTML
 *       when the Content-Type is mis-set. Cheap, no downside.
 *   - X-Frame-Options: SAMEORIGIN
 *       Stops random sites from iframing the admin / chat surfaces
 *       to bait a click-jack. Doesn't break the widget which uses
 *       same-origin iframes.
 *   - Referrer-Policy: strict-origin-when-cross-origin
 *       Standard browser default since ~2020; setting it explicitly
 *       guarantees the same behavior on older browsers and proxies.
 *   - Permissions-Policy: camera=(), microphone=(), geolocation=()
 *       Deny features we don't use. Defense-in-depth against a
 *       compromised dependency trying to grab them.
 *
 * Opt-in via env:
 *   - ENGINE_CSP — set to a full CSP string to enable. Audit your
 *     widget targets first. Example value below.
 */

import { Request, Response, NextFunction } from "express";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const cspValue = process.env.ENGINE_CSP || "";

export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(k, v);
  }
  if (cspValue) {
    res.setHeader("Content-Security-Policy", cspValue);
  }
  next();
}
