import type { AnalyzeRequest, AudioFormat, AudioQuality } from "./types";
import {
  getAudioAnalysisSampleSeconds as getConfiguredAudioAnalysisSampleSeconds,
  getMaxVideoDurationSeconds as getConfiguredMaxVideoDurationSeconds,
  getTempFileTtlMinutes as getConfiguredTempFileTtlMinutes
} from "./runtimeConfig";

export class AppError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

const validFormats = new Set<AudioFormat>(["mp3", "wav", "m4a", "flac", "ogg"]);

const validQualitiesByFormat: Record<AudioFormat, Set<AudioQuality>> = {
  mp3: new Set(["128k", "192k", "320k"]),
  wav: new Set(["lossless"]),
  m4a: new Set(["128k", "192k", "256k"]),
  flac: new Set(["lossless"]),
  ogg: new Set(["128k", "192k", "320k"])
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateAnalyzeRequest(payload: unknown): AnalyzeRequest {
  if (!isRecord(payload)) {
    throw new AppError("INVALID_REQUEST", "요청 형식이 올바르지 않습니다.");
  }

  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  const format = payload.format as AudioFormat;
  const quality = payload.quality as AudioQuality;
  const rightsConfirmed = payload.rightsConfirmed === true;

  if (!url) {
    throw new AppError("URL_REQUIRED", "YouTube 링크를 입력해 주세요.");
  }

  if (!rightsConfirmed) {
    throw new AppError(
      "RIGHTS_REQUIRED",
      "분석을 시작하려면 다운로드·변환·분석 권리 확인이 필요합니다."
    );
  }

  if (!validFormats.has(format)) {
    throw new AppError("INVALID_FORMAT", "지원하지 않는 오디오 포맷입니다.");
  }

  if (!validQualitiesByFormat[format].has(quality)) {
    throw new AppError("INVALID_QUALITY", "선택한 포맷에 맞지 않는 품질 옵션입니다.");
  }

  return { url, format, quality, rightsConfirmed };
}

export function getMaxVideoDurationSeconds() {
  return getConfiguredMaxVideoDurationSeconds();
}

export function getTempFileTtlMinutes() {
  return getConfiguredTempFileTtlMinutes();
}

export function getAudioAnalysisSampleSeconds() {
  return getConfiguredAudioAnalysisSampleSeconds();
}

export function getPublicError(error: unknown) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "서버에서 분석을 처리하는 동안 문제가 발생했습니다.",
    status: 500
  };
}
