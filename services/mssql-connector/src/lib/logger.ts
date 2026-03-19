import pino from "pino";
import { IS_DEV, LOG_LEVEL } from "./env-config";

const level = LOG_LEVEL || (IS_DEV ? "debug" : "info");

const redactPaths = [
  "apiKey",
  "api_key",
  "token",
  "password",
  "secret",
  "authorization",
  "cookie",
  "req.headers.authorization",
  "req.headers.cookie",
];

export const logger = pino({
  level,
  redact: { paths: redactPaths, censor: "[Redacted]" },
  ...(IS_DEV && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
});
