import type { AudioFormat } from "./types";

interface BuildDownloadFilenameInput {
  bpm?: number | null;
  key?: string | null;
  title?: string | null;
  format: AudioFormat;
  videoId?: string | null;
  maxLength?: number;
}

const defaultMaxLength = 180;
const unsafeFilenameChars = /[\/\\:*?"<>|]/g;
const whitespace = /[\s]+/g;
const repeatedUnderscore = /_+/g;
const repeatedSpace = / {2,}/g;
const bracketedFreeToken = /[\[(（{]\s*free\s*[\])）}]/giu;
const standaloneFreeToken = /(^|[^\p{L}\p{N}])free(?=$|[^\p{L}\p{N}])/giu;

function trimFilenameEdges(value: string) {
  return value.replace(/^[\s._]+|[\s.]+$/g, "").replace(/^_+|_+$/g, "");
}

function trimTitleEdges(value: string) {
  return trimFilenameEdges(value).replace(/^[\s._-]+|[\s._-]+$/g, "");
}

function removeFreePromoTokens(value: string) {
  return value.replace(bracketedFreeToken, " ").replace(standaloneFreeToken, "$1");
}

function sanitizeCompactPart(value: string) {
  return trimFilenameEdges(
    value
      .normalize("NFC")
      .replace(unsafeFilenameChars, "_")
      .replace(/[\u0000-\u001f\u007f]/g, "_")
      .replace(whitespace, "_")
      .replace(repeatedUnderscore, "_")
  );
}

function sanitizeTitlePart(value: string) {
  return trimTitleEdges(
    removeFreePromoTokens(value)
      .normalize("NFC")
      .replace(unsafeFilenameChars, " ")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(whitespace, " ")
      .replace(repeatedSpace, " ")
  );
}

function truncateByCodePoint(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return trimFilenameEdges(Array.from(value).slice(0, Math.max(1, maxLength)).join(""));
}

function formatBpm(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}` : "unknown";
}

function formatKey(value: string | null | undefined) {
  const sanitized = value ? sanitizeCompactPart(value) : "";
  return sanitized || "unknown";
}

function formatTitle(title: string | null | undefined, videoId: string | null | undefined) {
  const sanitizedTitle = title ? sanitizeTitlePart(title) : "";
  if (sanitizedTitle) {
    return sanitizedTitle;
  }

  const sanitizedVideoId = videoId ? sanitizeCompactPart(videoId) : "";
  return sanitizedVideoId || "untitled";
}

export function buildDownloadFilename({
  bpm,
  key,
  title,
  format,
  videoId,
  maxLength = defaultMaxLength
}: BuildDownloadFilenameInput) {
  const bpmPart = formatBpm(bpm);
  const keyPart = formatKey(key);
  const extension = `.${format}`;
  const prefix = `[neptune][${bpmPart}-${keyPart}]`;
  const fallbackTitle = formatTitle(title, videoId);
  const availableTitleLength = Math.max(1, maxLength - prefix.length - extension.length);
  const titlePart = truncateByCodePoint(fallbackTitle, availableTitleLength) || "untitled";

  return `${prefix}${titlePart}${extension}`;
}

function toAsciiFallback(filename: string) {
  const fallback = filename
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(unsafeFilenameChars, "_")
    .replace(whitespace, "_")
    .replace(repeatedUnderscore, "_")
    .replace(/"/g, "")
    .trim();

  return fallback || "neptune-audio";
}

function encodeRfc5987Value(value: string) {
  return encodeURIComponent(value).replace(/['()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function buildContentDisposition(filename: string) {
  const asciiFilename = toAsciiFallback(filename).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeRfc5987Value(filename)}`;
}
