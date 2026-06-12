import pino from 'pino';
import { config } from './config';

// ---------------------------------------------------------------------------
// Log-level configuration
// Honour the LOG_LEVEL env var; fall back to 'debug' in dev, 'info' otherwise.
// ---------------------------------------------------------------------------
const level = process.env.LOG_LEVEL || (config.isDev ? 'debug' : 'info');

// ---------------------------------------------------------------------------
// Sensitive data redaction
// Pino's built-in redaction replaces values at the listed paths with
// "[Redacted]" before the log record is serialised.
// ---------------------------------------------------------------------------
const redactPaths = [
  'apiKey',
  'api_key',
  'token',
  'password',
  'secret',
  'authorization',
  'cookie',
  // Nested variants (e.g. req.headers.authorization)
  'req.headers.authorization',
  'req.headers.cookie',
];

// ---------------------------------------------------------------------------
// Log rotation
// Pino writes to stdout by default. In containerised / production deployments
// log rotation is handled by the container runtime (Docker, Kubernetes) or a
// process manager (systemd, PM2). No file-based rotation is needed here.
//
// If you need file-based rotation in a non-container environment, use:
//   pino.transport({ target: 'pino/file', options: { destination: 'app.log' } })
// combined with an external tool such as `logrotate` or `pino-roll`.
// ---------------------------------------------------------------------------

export const logger = pino({
  level,
  redact: {
    paths: redactPaths,
    censor: '[Redacted]',
  },
  ...(config.isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
});
