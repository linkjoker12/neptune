import type { Locale } from "./i18n";

export type AudioFormat = "mp3" | "wav" | "m4a" | "flac" | "ogg";

export type AudioQuality = "128k" | "192k" | "256k" | "320k" | "lossless";

export type EvidenceSource = "title" | "description" | "comment";

export interface AnalyzeRequest {
  url: string;
  format: AudioFormat;
  quality: AudioQuality;
  rightsConfirmed: boolean;
  locale?: Locale;
}

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId?: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
}

export interface CommentItem {
  id: string;
  text: string;
  author?: string;
  publishedAt?: string;
}

export interface ExtractionEvidence<TValue = number | string> {
  kind: "bpm" | "key";
  value: TValue;
  normalizedValue: string;
  source: EvidenceSource;
  snippet: string;
  weight: number;
}

export interface CandidateEstimate<TValue = number | string> {
  value: TValue | null;
  confidence: number;
  evidence: ExtractionEvidence<TValue>[];
  alternatives: Array<{
    value: TValue;
    confidence: number;
    evidenceCount: number;
  }>;
}

export interface TextAnalysis {
  bpm: CandidateEstimate<number>;
  key: CandidateEstimate<string>;
}

export interface AudioAnalysis {
  bpm: number | null;
  bpmConfidence: number;
  bpmAlternatives?: Array<{
    bpm: number;
    confidence: number;
  }>;
  key: string | null;
  keyConfidence: number;
  error?: string;
  errorCode?: string;
}

export interface DownloadFileInfo {
  fileId: string;
  filename: string;
  format: AudioFormat;
  quality: AudioQuality;
  url: string;
  expiresAt: string;
  sizeBytes?: number;
}

export interface Recommendation {
  bpm: {
    value: number | null;
    source: "text" | "audio" | "none";
    reason: string;
  };
  key: {
    value: string | null;
    source: "text" | "audio" | "none";
    reason: string;
  };
}

export interface AnalyzeSuccessResponse {
  ok: true;
  metadata: YouTubeMetadata;
  commentsFetched: number;
  commentWarning?: string;
  textAnalysis: TextAnalysis;
  audioAnalysis?: AudioAnalysis;
  recommendation: Recommendation;
  download?: DownloadFileInfo;
  warnings: string[];
  warningCodes?: string[];
  logs: string[];
}

export interface AnalyzeErrorResponse {
  ok: false;
  code: string;
  message: string;
}

export type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse;
