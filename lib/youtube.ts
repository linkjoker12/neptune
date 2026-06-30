import { AppError } from "./validation";
import type { CommentItem, YouTubeMetadata } from "./types";

type YouTubeThumbnailMap = Record<string, { url: string; width?: number; height?: number }>;

interface YouTubeVideoListResponse {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      channelId?: string;
      channelTitle: string;
      description: string;
      publishedAt: string;
      thumbnails?: YouTubeThumbnailMap;
    };
    contentDetails: {
      duration: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface YouTubeCommentThreadsResponse {
  items?: Array<{
    id: string;
    snippet: {
      topLevelComment: {
        snippet: {
          textDisplay?: string;
          textOriginal?: string;
          authorDisplayName?: string;
          authorChannelId?: {
            value?: string;
          };
          publishedAt?: string;
        };
      };
    };
  }>;
  error?: {
    message?: string;
  };
}

export interface YouTubeBundle {
  metadata: YouTubeMetadata;
  comments: CommentItem[];
  commentWarning?: string;
}

function getApiKey() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  return apiKey && apiKey.trim().length > 0 ? apiKey : null;
}

const maxRelevantCommentCandidates = "20";

function buildApiUrl(endpoint: string, params: Record<string, string>) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function fetchYouTubeJson<TResponse>(url: string): Promise<TResponse> {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new AppError(
      "YOUTUBE_API_ERROR",
      "YouTube API에서 정보를 가져오지 못했습니다. API 키와 할당량을 확인해 주세요.",
      502
    );
  }

  return (await response.json()) as TResponse;
}

export function parseIso8601Duration(duration: string) {
  const match = duration.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) {
    return 0;
  }

  const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  return (
    Number.parseInt(days, 10) * 86400 +
    Number.parseInt(hours, 10) * 3600 +
    Number.parseInt(minutes, 10) * 60 +
    Number.parseInt(seconds, 10)
  );
}

function selectThumbnail(thumbnails?: YouTubeThumbnailMap) {
  if (!thumbnails) {
    return "";
  }

  return (
    thumbnails.maxres?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    ""
  );
}

async function fetchVideoMetadata(videoId: string, apiKey: string) {
  const url = buildApiUrl("videos", {
    part: "snippet,contentDetails",
    id: videoId,
    key: apiKey
  });
  const data = await fetchYouTubeJson<YouTubeVideoListResponse>(url);
  const item = data.items?.[0];

  if (!item) {
    throw new AppError("VIDEO_NOT_FOUND", "해당 YouTube 영상을 찾을 수 없습니다.", 404);
  }

  return {
    videoId,
    title: item.snippet.title,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    thumbnail: selectThumbnail(item.snippet.thumbnails),
    duration: item.contentDetails.duration,
    durationSeconds: parseIso8601Duration(item.contentDetails.duration)
  } satisfies YouTubeMetadata;
}

function mapCommentThread(item: NonNullable<YouTubeCommentThreadsResponse["items"]>[number]) {
  const snippet = item.snippet.topLevelComment.snippet;
  return {
    id: item.id,
    text: snippet.textOriginal ?? snippet.textDisplay ?? "",
    author: snippet.authorDisplayName,
    publishedAt: snippet.publishedAt
  };
}

async function fetchFocusedComments(videoId: string, channelId: string | undefined, apiKey: string) {
  const url = buildApiUrl("commentThreads", {
    part: "snippet",
    videoId,
    maxResults: maxRelevantCommentCandidates,
    order: "relevance",
    textFormat: "plainText",
    key: apiKey
  });
  const data = await fetchYouTubeJson<YouTubeCommentThreadsResponse>(url);
  const items = data.items ?? [];
  const selected = new Map<string, NonNullable<YouTubeCommentThreadsResponse["items"]>[number]>();
  const pinnedCandidate = items[0];

  if (pinnedCandidate) {
    selected.set(pinnedCandidate.id, pinnedCandidate);
  }

  for (const item of items) {
    const authorChannelId = item.snippet.topLevelComment.snippet.authorChannelId?.value;
    if (channelId && authorChannelId === channelId) {
      selected.set(item.id, item);
    }
  }

  return [...selected.values()].map(mapCommentThread);
}

async function fetchOEmbedMetadata(videoId: string) {
  const fallback = {
    videoId,
    title: `YouTube video ${videoId}`,
    channelTitle: "YouTube",
    description: "",
    publishedAt: "",
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: "PT0S",
    durationSeconds: 0
  } satisfies YouTubeMetadata;

  try {
    const url = new URL("https://www.youtube.com/oembed");
    url.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`);
    url.searchParams.set("format", "json");

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) {
      return fallback;
    }

    const data = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };

    return {
      ...fallback,
      title: data.title ?? fallback.title,
      channelTitle: data.author_name ?? fallback.channelTitle,
      thumbnail: data.thumbnail_url ?? fallback.thumbnail
    } satisfies YouTubeMetadata;
  } catch {
    return fallback;
  }
}

async function fetchNoApiMetadata(videoId: string) {
  const fallback = await fetchOEmbedMetadata(videoId);

  try {
    const { processAudioMetadata } = await import("./audioJob");
    const info = await processAudioMetadata(videoId);
    return {
      videoId,
      title: info.title || fallback.title,
      channelTitle: info.channelTitle || fallback.channelTitle,
      description: info.description || fallback.description,
      publishedAt: info.publishedAt || fallback.publishedAt,
      thumbnail: info.thumbnail || fallback.thumbnail,
      duration: info.durationSeconds ? `PT${Math.round(info.durationSeconds)}S` : fallback.duration,
      durationSeconds: info.durationSeconds || fallback.durationSeconds
    } satisfies YouTubeMetadata;
  } catch {
    return fallback;
  }
}

export async function fetchYouTubeBundle(videoId: string): Promise<YouTubeBundle> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      metadata: await fetchNoApiMetadata(videoId),
      comments: []
    };
  }

  const metadata = await fetchVideoMetadata(videoId, apiKey);

  try {
    const comments = await fetchFocusedComments(videoId, metadata.channelId, apiKey);
    return { metadata, comments };
  } catch {
    return {
      metadata,
      comments: [],
      commentWarning: "댓글을 가져올 수 없지만, 제목과 설명을 기준으로 분석을 계속합니다."
    };
  }
}
