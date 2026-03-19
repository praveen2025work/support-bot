import pino from "pino";
import { LOG_LEVEL, IS_DEV } from "./env-config";

export const logger = pino({
  level: LOG_LEVEL,
  ...(IS_DEV
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
});
