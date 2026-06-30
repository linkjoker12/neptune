export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const validLogLevels = new Set<LogLevel>(["debug", "info", "warn", "error", "silent"]);

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cleanBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : "";
}

export function getAppUrl() {
  return cleanBaseUrl(process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL);
}

export function getDownloadBaseUrl() {
  return cleanBaseUrl(process.env.DOWNLOAD_BASE_URL) || getAppUrl();
}

export function getMaxVideoDurationSeconds() {
  return positiveInteger(process.env.MAX_VIDEO_DURATION_SECONDS, 600);
}

export function getTempFileTtlMinutes() {
  return positiveInteger(process.env.TEMP_FILE_TTL_MINUTES, 30);
}

export function getAudioAnalysisSampleSeconds() {
  return positiveInteger(process.env.AUDIO_ANALYSIS_SAMPLE_SECONDS, 180);
}

export function getMaxConcurrentJobs() {
  return positiveInteger(process.env.MAX_CONCURRENT_JOBS ?? process.env.MAX_CONCURRENT_AUDIO_JOBS, 2);
}

export function getJobTimeoutMs() {
  return positiveInteger(process.env.JOB_TIMEOUT_SECONDS, 900) * 1000;
}

export function getLogLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase() as LogLevel | undefined;
  return configured && validLogLevels.has(configured) ? configured : "info";
}
