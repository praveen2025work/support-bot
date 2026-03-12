import { Request, Response, NextFunction } from 'express';
import { logger } from '@/lib/logger';

/**
 * Authentication types supported per-query or per-group:
 *
 * "none"          — No authentication (demo/development)
 * "bearer"        — Authorization: Bearer <token> (uses global API_TOKEN)
 * "windows"       — Windows Authentication — forwards user's AD cookies/headers
 * "bam"           — BAM token: fetches token from bamTokenUrl, sends as X-BAM-Token
 * "bam_token"     — (legacy alias for "bam")
 * "ip_whitelist"  — IP-based access control
 *
 * Per-query auth is configured in each query's config:
 * {
 *   "name": "my_query",
 *   "authType": "bam",
 *   "bamTokenUrl": "https://auth.company.com/bam/token"
 * }
 */

export type AuthType = 'none' | 'bearer' | 'windows' | 'bam' | 'bam_token' | 'ip_whitelist';

export interface AuthConfig {
  authType: AuthType;
  // Bearer token
  token?: string;
  // BAM token
  bamToken?: string;
  // Windows auth
  domain?: string;
  username?: string;
  password?: string;
  // IP whitelist
  allowedIps?: string[];
}

/**
 * Middleware to validate incoming requests to the Engine API.
 * This validates that the caller (the UI service) is authorized.
 * In demo mode, this is a passthrough.
 */
export function engineAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const engineApiKey = process.env.ENGINE_API_KEY;

  // No API key configured = demo mode, allow all
  if (!engineApiKey) {
    return next();
  }

  const provided = req.headers['x-engine-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (provided !== engineApiKey) {
    logger.warn({ ip: req.ip, url: req.url }, 'Unauthorized Engine API request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

/**
 * Build HTTP headers for outbound requests to tenant APIs.
 * Used by the ApiClient when calling real tenant endpoints.
 */
export function buildTenantAuthHeaders(config?: AuthConfig): Record<string, string> {
  if (!config || config.authType === 'none') {
    return {};
  }

  switch (config.authType) {
    case 'bearer':
      return config.token ? { Authorization: `Bearer ${config.token}` } : {};

    case 'bam':
    case 'bam_token':
      return config.bamToken ? { 'X-BAM-Token': config.bamToken } : {};

    case 'windows':
      // Windows auth (NTLM/Kerberos) is handled at the HTTP client level,
      // not via headers. This returns empty headers; the ApiClient should
      // use httpntlm or node-sspi when authType === 'windows'.
      return {};

    case 'ip_whitelist':
      // IP whitelisting is configured on the tenant's firewall.
      // No special headers needed from our side.
      return {};

    default:
      return {};
  }
}

/**
 * Validate IP whitelist for incoming requests.
 * Use as middleware when the engine itself needs IP-based access control.
 */
export function ipWhitelistMiddleware(allowedIps: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.socket.remoteAddress || '';
    const normalized = clientIp.replace(/^::ffff:/, '');

    if (allowedIps.includes(normalized) || allowedIps.includes('*')) {
      return next();
    }

    logger.warn({ clientIp: normalized, url: req.url }, 'IP not whitelisted');
    return res.status(403).json({ error: 'Forbidden — IP not whitelisted' });
  };
}
