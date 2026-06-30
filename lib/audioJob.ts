import { spawn } from "node:child_process";
import { createReadStream, existsSync, promises as fs, readdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { cleanupTempRoot, ensureTempRoot, removeTempPath } from "./fileCleanup";
import { logger } from "./logger";
import { getDownloadBaseUrl, getJobTimeoutMs, getMaxConcurrentJobs } from "./runtimeConfig";
import {
  AppError,
  getAudioAnalysisSampleSeconds,
  getMaxVideoDurationSeconds,
  getTempFileTtlMinutes
} from "./validation";
import type { AudioAnalysis, AudioFormat, AudioQuality, DownloadFileInfo } from "./types";

interface ProcessAudioJobInput {
  videoId: string;
  format: AudioFormat;
  quality: AudioQuality;
  durationSeconds?: number;
}

export interface AudioMetadata {
  title: string;
  channelTitle: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  durationSeconds: number;
}

interface StoredDownload {
  fileId: string;
  path: string;
  filename: string;
  mimeType: string;
  format: AudioFormat;
  quality: AudioQuality;
  expiresAt: number;
  jobDir: string;
  sizeBytes?: number;
}

interface AudioStore {
  activeJobs: number;
  downloads: Map<string, StoredDownload>;
  cleanupTimer?: NodeJS.Timeout;
  startupCleanupStarted?: boolean;
  toolHealth?: {
    checkedAt: number;
    ffmpeg: boolean;
    python: boolean;
    ytDlp: boolean;
  };
}

const globalForAudio = globalThis as typeof globalThis & {
  __neptuneAudioStore?: AudioStore;
};

const store =
  globalForAudio.__neptuneAudioStore ??
  (globalForAudio.__neptuneAudioStore = {
    activeJobs: 0,
    downloads: new Map<string, StoredDownload>()
  });

const mimeTypes: Record<AudioFormat, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  flac: "audio/flac",
  ogg: "audio/ogg"
};

function getMaxConcurrentAudioJobs() {
  return getMaxConcurrentJobs();
}

type ToolName = "yt-dlp" | "ffmpeg" | "python";

function getBundledFfmpegPath() {
  const platform = `${process.platform}-${process.arch}`;
  const binary = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const directPath = path.join(
    process.cwd(),
    "node_modules",
    "@ffmpeg-installer",
    platform,
    binary
  );

  if (existsSync(directPath)) {
    return directPath;
  }

  const pnpmDir = path.join(process.cwd(), "node_modules", ".pnpm");
  if (!existsSync(pnpmDir)) {
    return null;
  }

  const packagePrefix = `@ffmpeg-installer+${platform}@`;
  for (const entry of readdirSync(pnpmDir)) {
    if (!entry.startsWith(packagePrefix)) {
      continue;
    }

    const candidate = path.join(
      pnpmDir,
      entry,
      "node_modules",
      "@ffmpeg-installer",
      platform,
      binary
    );

    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getFfmpegLocation() {
  return process.env.FFMPEG_BIN || getBundledFfmpegPath();
}

function getYtDlpJsRuntimeArgs() {
  const configuredRuntime = process.env.YT_DLP_JS_RUNTIME?.trim();

  if (configuredRuntime) {
    return ["--js-runtimes", configuredRuntime];
  }

  if (process.execPath && existsSync(process.execPath)) {
    return ["--js-runtimes", `node:${process.execPath}`];
  }

  return [];
}

function getYtDlpFfmpegArgs() {
  const ffmpegLocation = getFfmpegLocation();
  return ffmpegLocation ? ["--ffmpeg-location", ffmpegLocation] : [];
}

function getYtDlpImpersonationArgs() {
  const configured = process.env.YT_DLP_IMPERSONATE?.trim();
  return configured ? ["--impersonate", configured] : [];
}

function getYtDlpExtractorArgs() {
  const configured = process.env.YT_DLP_EXTRACTOR_ARGS?.trim();
  return configured ? ["--extractor-args", configured] : [];
}

function getYtDlpNetworkArgs() {
  return [
    "--force-ipv4",
    "--retries",
    "3",
    "--fragment-retries",
    "3",
    "--socket-timeout",
    "30",
    "--user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "--referer",
    "https://www.youtube.com/",
    "--add-header",
    "Accept-Language: en-US,en;q=0.9"
  ];
}

function getYtDlpBaseArgs() {
  return [
    "--no-playlist",
    ...getYtDlpNetworkArgs(),
    ...getYtDlpFfmpegArgs(),
    ...getYtDlpJsRuntimeArgs(),
    ...getYtDlpImpersonationArgs(),
    ...getYtDlpExtractorArgs()
  ];
}

function getToolCommand(name: ToolName) {
  if (name === "yt-dlp") {
    if (process.env.YT_DLP_BIN) {
      return { command: process.env.YT_DLP_BIN, argsPrefix: [] };
    }

    if (process.platform === "win32") {
      return { command: "py", argsPrefix: ["-m", "yt_dlp"] };
    }

    return { command: "yt-dlp", argsPrefix: [] };
  }

  if (name === "ffmpeg") {
    if (process.env.FFMPEG_BIN) {
      return { command: process.env.FFMPEG_BIN, argsPrefix: [] };
    }

    return { command: getFfmpegLocation() ?? "ffmpeg", argsPrefix: [] };
  }

  if (process.env.PYTHON_BIN) {
    return { command: process.env.PYTHON_BIN, argsPrefix: [] };
  }

  return {
    command: process.platform === "win32" ? "py" : "python3",
    argsPrefix: []
  };
}

function runCommand(command: string, args: string[], label: string) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    let timedOut = false;
    const child = spawn(command, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5_000).unref?.();
    }, getJobTimeoutMs());
    timeout.unref?.();

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 100_000) {
        stdout = stdout.slice(-100_000);
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 100_000) {
        stderr = stderr.slice(-100_000);
      }
    });

    child.on("error", () => {
      clearTimeout(timeout);
      reject(
        new AppError(
          "AUDIO_TOOL_UNAVAILABLE",
          `${label} 도구를 실행할 수 없습니다. 로컬 설치 또는 Docker 환경을 확인해 주세요.`,
          500
        )
      );
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(
          new AppError(
            "JOB_TIMEOUT",
            `${label} 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.`,
            504
          )
        );
        return;
      }

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new AppError(
          "AUDIO_PROCESS_FAILED",
          `${label} 처리에 실패했습니다. 공개 영상인지, 권한과 서버 도구 설치 상태를 확인해 주세요.`,
          500
        )
      );
    });
  });
}

function runTool(name: ToolName, args: string[], label: string) {
  const tool = getToolCommand(name);
  return runCommand(tool.command, [...tool.argsPrefix, ...args], label);
}

async function findSourceAudio(jobDir: string) {
  const files = await fs.readdir(jobDir);
  const sourceFile = files.find((file) => file.startsWith("source."));

  if (!sourceFile) {
    throw new AppError(
      "AUDIO_SOURCE_MISSING",
      "오디오 원본 파일을 생성하지 못했습니다.",
      500
    );
  }

  return path.join(jobDir, sourceFile);
}

async function clearSourceAudio(jobDir: string) {
  const files = await fs.readdir(jobDir).catch(() => []);
  await Promise.all(
    files
      .filter((file) => file.startsWith("source."))
      .map((file) => fs.rm(path.join(jobDir, file), { force: true }))
  );
}

async function downloadSourceAudio(videoId: string, jobDir: string, sourcePattern: string) {
  const formatSelectors = [
    "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best[acodec!=none]",
    "bestaudio/best",
    "18/best[height<=360][acodec!=none]/best"
  ];
  let lastError: unknown;

  for (const selector of formatSelectors) {
    await clearSourceAudio(jobDir);

    try {
      logger.debug("audio_extraction.selector_start", { videoId });
      await runTool(
        "yt-dlp",
        [
          ...getYtDlpBaseArgs(),
          "--no-continue",
          "--no-part",
          "--restrict-filenames",
          "-f",
          selector,
          "--output",
          sourcePattern,
          `https://www.youtube.com/watch?v=${videoId}`
        ],
        "오디오 추출"
      );
      await findSourceAudio(jobDir);
      return;
    } catch (error) {
      logger.warn("audio_extraction.selector_failed", { videoId });
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new AppError(
    "AUDIO_SOURCE_MISSING",
    "오디오 원본 파일을 생성하지 못했습니다.",
    500
  );
}

function conversionArgs(
  sourcePath: string,
  outputPath: string,
  format: AudioFormat,
  quality: AudioQuality
) {
  const args = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    "-threads",
    "0",
    "-i",
    sourcePath,
    "-map",
    "0:a:0",
    "-vn",
    "-sn",
    "-dn",
    "-map_metadata",
    "-1"
  ];

  if (format === "mp3") {
    return [...args, "-codec:a", "libmp3lame", "-b:a", quality, outputPath];
  }

  if (format === "m4a") {
    return [...args, "-codec:a", "aac", "-b:a", quality, outputPath];
  }

  if (format === "ogg") {
    return [...args, "-codec:a", "libvorbis", "-b:a", quality, outputPath];
  }

  if (format === "flac") {
    return [...args, "-codec:a", "flac", outputPath];
  }

  return [...args, "-codec:a", "pcm_s16le", outputPath];
}

function analysisSampleArgs(sourcePath: string, outputPath: string) {
  return [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    "-threads",
    "0",
    "-i",
    sourcePath,
    "-map",
    "0:a:0",
    "-t",
    `${getAudioAnalysisSampleSeconds()}`,
    "-vn",
    "-sn",
    "-dn",
    "-ac",
    "1",
    "-ar",
    "22050",
    "-codec:a",
    "pcm_s16le",
    outputPath
  ];
}

function normalizeAudioAnalysis(value: unknown): AudioAnalysis {
  if (typeof value !== "object" || value === null) {
    return {
      bpm: null,
      bpmConfidence: 0,
      key: null,
      keyConfidence: 0,
      error: "오디오 분석 결과 형식이 올바르지 않습니다."
    };
  }

  const record = value as Record<string, unknown>;
  const bpm = typeof record.bpm === "number" && Number.isFinite(record.bpm) ? record.bpm : null;
  const key = typeof record.key === "string" && record.key.length > 0 ? record.key : null;
  const bpmAlternatives = Array.isArray(record.bpmAlternatives)
    ? record.bpmAlternatives
        .map((item) => {
          if (typeof item !== "object" || item === null) {
            return null;
          }

          const candidate = item as Record<string, unknown>;
          const bpmValue =
            typeof candidate.bpm === "number" && Number.isFinite(candidate.bpm)
              ? Math.round(candidate.bpm)
              : null;
          const confidenceValue =
            typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence)
              ? Math.max(0, Math.min(100, Math.round(candidate.confidence)))
              : 0;

          if (bpmValue === null || confidenceValue < 50) {
            return null;
          }

          return {
            bpm: bpmValue,
            confidence: confidenceValue
          };
        })
        .filter((item): item is { bpm: number; confidence: number } => item !== null)
        .slice(0, 3)
    : undefined;
  const bpmConfidence =
    typeof record.bpmConfidence === "number" && Number.isFinite(record.bpmConfidence)
      ? Math.max(0, Math.min(100, Math.round(record.bpmConfidence)))
      : 0;
  const keyConfidence =
    typeof record.keyConfidence === "number" && Number.isFinite(record.keyConfidence)
      ? Math.max(0, Math.min(100, Math.round(record.keyConfidence)))
      : 0;
  const error = typeof record.error === "string" ? record.error : undefined;

  return { bpm, bpmConfidence, bpmAlternatives, key, keyConfidence, error };
}

async function ensureVideoWithinDurationLimit(videoId: string) {
  logger.info("duration_check.start", { videoId });
  const { stdout } = await runTool(
    "yt-dlp",
    [
      ...getYtDlpBaseArgs(),
      "--print",
      "duration",
      "--skip-download",
      `https://www.youtube.com/watch?v=${videoId}`
    ],
    "영상 정보 확인"
  );
  let duration: number | null = null;
  try {
    const value = Number.parseFloat(stdout.trim().split(/\r?\n/).at(-1) ?? "");
    duration = Number.isFinite(value) ? value : null;
  } catch {
    duration = null;
  }

  if (duration !== null && duration > getMaxVideoDurationSeconds()) {
    throwDurationExceeded();
  }
  logger.info("duration_check.success", { videoId, durationSeconds: duration ?? 0 });
}

function throwDurationExceeded(): never {
  throw new AppError(
    "DURATION_EXCEEDED",
    "이 영상은 길이 제한을 초과해 처리할 수 없습니다.",
    400
  );
}

function hasKnownAllowedDuration(durationSeconds: number | undefined) {
  if (
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return false;
  }

  if (durationSeconds > getMaxVideoDurationSeconds()) {
    throwDurationExceeded();
  }

  return true;
}

async function analyzeAudio(sourcePath: string): Promise<AudioAnalysis> {
  const workerPath = path.join(process.cwd(), "worker", "analyze_audio.py");

  try {
    logger.info("bpm_key_analysis.start");
    const { stdout } = await runTool("python", [workerPath, sourcePath], "오디오 분석");
    const payload = stdout.trim().split(/\r?\n/).at(-1) ?? "{}";
    const result = normalizeAudioAnalysis(JSON.parse(payload));
    logger.info("bpm_key_analysis.success", {
      bpm: result.bpm ?? 0,
      keyFound: Boolean(result.key)
    });
    return result;
  } catch {
    logger.warn("bpm_key_analysis.failed");
    return {
      bpm: null,
      bpmConfidence: 0,
      key: null,
      keyConfidence: 0,
      error: "오디오 BPM/Key 분석을 완료하지 못했습니다."
    };
  }
}

function parseJsonLine<TValue>(line: string, fallback: TValue) {
  try {
    return JSON.parse(line) as TValue;
  } catch {
    return fallback;
  }
}

function formatUploadDate(value: string) {
  if (!/^\d{8}$/.test(value)) {
    return "";
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00Z`;
}

export async function processAudioMetadata(videoId: string): Promise<AudioMetadata> {
  logger.info("metadata_fetch.start", { videoId });
  const { stdout } = await runTool(
    "yt-dlp",
    [
      ...getYtDlpBaseArgs(),
      "--skip-download",
      "--no-warnings",
      "--print",
      "%(title)#j",
      "--print",
      "%(uploader)#j",
      "--print",
      "%(duration)#j",
      "--print",
      "%(upload_date)#j",
      "--print",
      "%(thumbnail)#j",
      "--print",
      "%(description)#j",
      `https://www.youtube.com/watch?v=${videoId}`
    ],
    "영상 정보 확인"
  );
  const lines = stdout.trim().split(/\r?\n/);

  const metadata = {
    title: parseJsonLine(lines[0] ?? "", ""),
    channelTitle: parseJsonLine(lines[1] ?? "", ""),
    durationSeconds: parseJsonLine(lines[2] ?? "", 0),
    publishedAt: formatUploadDate(parseJsonLine(lines[3] ?? "", "")),
    thumbnail: parseJsonLine(lines[4] ?? "", ""),
    description: parseJsonLine(lines.slice(5).join("\n"), "")
  };

  logger.info("metadata_fetch.success", {
    videoId,
    durationSeconds: metadata.durationSeconds
  });

  return metadata;
}

async function cleanupExpiredDownloads() {
  logger.debug("temp_cleanup.start");
  const now = Date.now();
  const expired = [...store.downloads.values()].filter((item) => item.expiresAt <= now);

  for (const item of expired) {
    store.downloads.delete(item.fileId);
    await removeTempPath(item.jobDir).catch(() => undefined);
  }
  if (expired.length > 0) {
    logger.info("temp_cleanup.success", { removed: expired.length });
  }
}

function ensureCleanupTimer() {
  if (!store.startupCleanupStarted) {
    store.startupCleanupStarted = true;
    void cleanupTempRoot(getTempFileTtlMinutes())
      .then((removed) => logger.info("temp_cleanup.startup_success", { removed }))
      .catch(() => logger.warn("temp_cleanup.startup_failed"));
  }

  if (store.cleanupTimer) {
    return;
  }

  store.cleanupTimer = setInterval(() => {
    void cleanupExpiredDownloads();
  }, 60_000);
  store.cleanupTimer.unref?.();
}

export async function processAudioJob({
  videoId,
  format,
  quality,
  durationSeconds
}: ProcessAudioJobInput): Promise<{
  audioAnalysis: AudioAnalysis;
  download: DownloadFileInfo;
}> {
  ensureCleanupTimer();
  await cleanupExpiredDownloads();

  if (store.activeJobs >= getMaxConcurrentAudioJobs()) {
    throw new AppError(
      "AUDIO_QUEUE_BUSY",
      "현재 오디오 작업이 많아 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      429
    );
  }

  store.activeJobs += 1;
  logger.info("audio_job.start", { videoId, format, quality, activeJobs: store.activeJobs });

  try {
    const tempRoot = await ensureTempRoot();
    const jobId = randomUUID();
    const fileId = randomUUID();
    const jobDir = path.join(tempRoot, jobId);
    await fs.mkdir(jobDir, { recursive: true });
    if (!hasKnownAllowedDuration(durationSeconds)) {
      await ensureVideoWithinDurationLimit(videoId);
    }

    const sourcePattern = path.join(jobDir, "source.%(ext)s");
    logger.info("audio_extraction.start", { videoId });
    await downloadSourceAudio(videoId, jobDir, sourcePattern);
    logger.info("audio_extraction.success", { videoId });

    const sourcePath = await findSourceAudio(jobDir);
    const analysisPath = path.join(jobDir, "analysis.wav");
    logger.info("analysis_sample.start", { videoId });
    await runTool(
      "ffmpeg",
      analysisSampleArgs(sourcePath, analysisPath),
      "분석 샘플 생성"
    );
    logger.info("analysis_sample.success", { videoId });
    const internalFilename = `neptune-${fileId}.${format}`;
    const outputPath = path.join(jobDir, internalFilename);

    logger.info("audio_conversion.start", { videoId, format });
    const [audioAnalysis] = await Promise.all([
      analyzeAudio(analysisPath),
      runTool(
        "ffmpeg",
        conversionArgs(sourcePath, outputPath, format, quality),
        "오디오 변환"
      )
    ]);
    logger.info("audio_conversion.success", { videoId, format });

    const stat = await fs.stat(outputPath);
    const expiresAt = Date.now() + getTempFileTtlMinutes() * 60_000;
    const stored: StoredDownload = {
      fileId,
      path: outputPath,
      filename: internalFilename,
      mimeType: mimeTypes[format],
      format,
      quality,
      expiresAt,
      jobDir,
      sizeBytes: stat.size
    };
    store.downloads.set(fileId, stored);

    return {
      audioAnalysis,
      download: {
        fileId,
        filename: internalFilename,
        format,
        quality,
        url: buildDownloadUrl(fileId),
        expiresAt: new Date(expiresAt).toISOString(),
        sizeBytes: stat.size
      }
    };
  } finally {
    store.activeJobs -= 1;
    logger.info("audio_job.finish", { videoId, activeJobs: store.activeJobs });
  }
}

function buildDownloadUrl(fileId: string) {
  const relativeUrl = `/api/download?fileId=${encodeURIComponent(fileId)}`;
  const baseUrl = getDownloadBaseUrl();
  return baseUrl ? `${baseUrl}${relativeUrl}` : relativeUrl;
}

export function updateDownloadFilename(fileId: string, filename: string) {
  if (!/^[0-9a-f-]{36}$/i.test(fileId)) {
    return false;
  }

  const item = store.downloads.get(fileId);
  if (!item || item.expiresAt <= Date.now()) {
    return false;
  }

  item.filename = filename;
  return true;
}

export async function getDownloadStream(fileId: string) {
  ensureCleanupTimer();
  await cleanupExpiredDownloads();

  if (!/^[0-9a-f-]{36}$/i.test(fileId)) {
    return null;
  }

  const item = store.downloads.get(fileId);
  if (!item || item.expiresAt <= Date.now()) {
    if (item) {
      store.downloads.delete(fileId);
      await removeTempPath(item.jobDir).catch(() => undefined);
    }
    return null;
  }

  const stat = await fs.stat(item.path).catch(() => null);
  if (!stat?.isFile()) {
    store.downloads.delete(fileId);
    return null;
  }

  return {
    stream: Readable.toWeb(createReadStream(item.path)) as unknown as BodyInit,
    filename: item.filename,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes ?? stat.size
  };
}

async function checkTool(commandName: ToolName, args: string[]) {
  try {
    await runTool(commandName, args, `${commandName} 상태 확인`);
    return true;
  } catch {
    return false;
  }
}

export async function getAudioToolHealth() {
  const now = Date.now();
  if (store.toolHealth && now - store.toolHealth.checkedAt < 60_000) {
    return store.toolHealth;
  }

  const [ffmpeg, python, ytDlp] = await Promise.all([
    checkTool("ffmpeg", ["-version"]),
    checkTool("python", ["--version"]),
    checkTool("yt-dlp", ["--version"])
  ]);

  store.toolHealth = {
    checkedAt: now,
    ffmpeg,
    python,
    ytDlp
  };

  return store.toolHealth;
}
