import { AppError } from "./validation";

const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;

export interface ParsedYouTubeUrl {
  videoId: string;
  canonicalUrl: string;
}

function cleanHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function assertVideoId(value: string | null | undefined): string {
  if (!value || !videoIdPattern.test(value)) {
    throw new AppError(
      "INVALID_YOUTUBE_URL",
      "유효한 YouTube 영상 ID를 찾을 수 없습니다."
    );
  }

  return value;
}

function normalizeUrlInput(input: string) {
  const trimmed = input.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (
    /^(www\.)?(youtube\.com|youtu\.be)\//i.test(trimmed) ||
    /^(m|music)\.youtube\.com\//i.test(trimmed)
  ) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

export function parseVideoId(input: string): ParsedYouTubeUrl {
  let url: URL;

  try {
    url = new URL(normalizeUrlInput(input));
  } catch {
    throw new AppError("INVALID_URL", "올바른 URL 형식이 아닙니다.");
  }

  const hostname = cleanHostname(url.hostname);
  let videoId: string | null = null;

  if (hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (
    hostname === "youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname === "music.youtube.com"
  ) {
    const pathSegments = url.pathname.split("/").filter(Boolean);

    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else if (pathSegments[0] === "shorts" || pathSegments[0] === "embed") {
      videoId = pathSegments[1] ?? null;
    }
  } else {
    throw new AppError("NOT_YOUTUBE_URL", "YouTube 링크만 분석할 수 있습니다.");
  }

  const parsedVideoId = assertVideoId(videoId);

  return {
    videoId: parsedVideoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${parsedVideoId}`
  };
}
