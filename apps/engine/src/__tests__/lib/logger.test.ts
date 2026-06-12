import { describe, it, expect, beforeAll } from "vitest";
import type { LoggerOptions } from "pino";

// Setting LOG_SHIP_URL before the module loads makes its singleton take the
// in-process multistream path (no pino-pretty worker thread), so importing the
// real logger here doesn't leak a worker.
process.env.LOG_SHIP_URL = "http://127.0.0.1:59999/__logger_unit_noop";

let buildLoggerOptions: (env?: NodeJS.ProcessEnv) => LoggerOptions;

beforeAll(async () => {
  ({ buildLoggerOptions } = await import("@/lib/logger"));
});

describe("buildLoggerOptions", () => {
  it("uses pino-pretty + debug in dev with no ship URL", () => {
    const opts = buildLoggerOptions({
      NODE_ENV: "development",
    } as NodeJS.ProcessEnv);
    expect(opts.level).toBe("debug");
    expect((opts.transport as { target: string }).target).toBe("pino-pretty");
    expect((opts.base as { instance: string }).instance).toBeDefined();
  });

  it("emits structured JSON to stdout (no transport) in production", () => {
    const opts = buildLoggerOptions({
      NODE_ENV: "production",
    } as NodeJS.ProcessEnv);
    expect(opts.level).toBe("info");
    expect(opts.transport).toBeUndefined();
  });

  it("honours a LOG_LEVEL override", () => {
    const opts = buildLoggerOptions({
      NODE_ENV: "production",
      LOG_LEVEL: "warn",
    } as NodeJS.ProcessEnv);
    expect(opts.level).toBe("warn");
  });

  it("drops the pretty transport when shipping is enabled (even in dev)", () => {
    const opts = buildLoggerOptions({
      NODE_ENV: "development",
      LOG_SHIP_URL: "http://sink.example/push",
    } as NodeJS.ProcessEnv);
    expect(opts.transport).toBeUndefined();
  });

  it("preserves redaction paths + censor", () => {
    const opts = buildLoggerOptions({
      NODE_ENV: "production",
    } as NodeJS.ProcessEnv);
    const redact = opts.redact as { paths: string[]; censor: string };
    expect(redact.paths).toContain("authorization");
    expect(redact.paths).toContain("req.headers.authorization");
    expect(redact.censor).toBe("[Redacted]");
  });
});
