import { getLogLevel, type LogLevel } from "./runtimeConfig";

type LogMeta = Record<string, string | number | boolean | null | undefined>;

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50
};

function shouldLog(level: Exclude<LogLevel, "silent">) {
  return levelPriority[level] >= levelPriority[getLogLevel()];
}

function safeMeta(meta: LogMeta | undefined) {
  if (!meta) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(meta).filter(([key, value]) => {
      const lowered = key.toLowerCase();
      return (
        value !== undefined &&
        !lowered.includes("key") &&
        !lowered.includes("secret") &&
        !lowered.includes("token") &&
        !lowered.includes("path")
      );
    })
  );
}

function write(level: Exclude<LogLevel, "silent">, event: string, meta?: LogMeta) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = safeMeta(meta);
  const message = `[neptune] ${event}`;
  if (payload && Object.keys(payload).length > 0) {
    console[level](message, payload);
    return;
  }

  console[level](message);
}

export const logger = {
  debug: (event: string, meta?: LogMeta) => write("debug", event, meta),
  info: (event: string, meta?: LogMeta) => write("info", event, meta),
  warn: (event: string, meta?: LogMeta) => write("warn", event, meta),
  error: (event: string, meta?: LogMeta) => write("error", event, meta)
};
