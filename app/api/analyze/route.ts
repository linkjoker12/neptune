import { NextResponse } from "next/server";
import { processAudioJob, updateDownloadFilename } from "@/lib/audioJob";
import { buildRecommendation } from "@/lib/confidence";
import { buildDownloadFilename } from "@/lib/downloadFilename";
import { getErrorMessage, getMessages, getWarningMessage, normalizeLocale } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { parseVideoId } from "@/lib/parseVideoId";
import { extractTextAnalysis } from "@/lib/textExtraction";
import { getMaxVideoDurationSeconds, getPublicError, validateAnalyzeRequest } from "@/lib/validation";
import { fetchYouTubeBundle } from "@/lib/youtube";
import type { AnalyzeSuccessResponse, AudioAnalysis, DownloadFileInfo } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
    const locale = normalizeLocale(
      typeof payload === "object" && payload !== null && "locale" in payload
        ? payload.locale
        : undefined
    );
    const t = getMessages(locale);
    const input = validateAnalyzeRequest(payload);
    const parsed = parseVideoId(input.url);
    logger.info("analyze.request", { videoId: parsed.videoId, format: input.format, quality: input.quality });
    logger.info("metadata_fetch.start", { videoId: parsed.videoId });
    const { metadata, comments, commentWarning } = await fetchYouTubeBundle(parsed.videoId);
    logger.info("metadata_fetch.success", {
      videoId: parsed.videoId,
      comments: comments.length,
      durationSeconds: metadata.durationSeconds
    });
    logger.info("text_analysis.start", { videoId: parsed.videoId });
    const textAnalysis = extractTextAnalysis(metadata, comments);
    logger.info("text_analysis.success", {
      videoId: parsed.videoId,
      bpmConfidence: textAnalysis.bpm.confidence,
      keyConfidence: textAnalysis.key.confidence
    });
    const warnings: string[] = [];
    const warningCodes: string[] = [];
    let audioAnalysis: AudioAnalysis | undefined;
    let download: DownloadFileInfo | undefined;
    const logs: string[] = [
      t.server.logs.videoConfirmed(metadata.videoId),
      t.server.logs.textExtracted(comments.length),
      t.server.logs.bpmConfidence(textAnalysis.bpm.confidence),
      t.server.logs.keyConfidence(textAnalysis.key.confidence)
    ];

    if (commentWarning) {
      warnings.push(t.server.commentWarning);
      warningCodes.push("COMMENT_UNAVAILABLE");
      logs.push(t.server.logs.commentsFailed);
    }

    if (metadata.durationSeconds > getMaxVideoDurationSeconds()) {
      warnings.push(t.server.warnings.durationExceeded);
      warningCodes.push("DURATION_EXCEEDED");
      logs.push(t.server.logs.durationSkipped);
    } else {
      try {
        logger.info("audio_processing.start", { videoId: parsed.videoId });
        const audioResult = await processAudioJob({
          videoId: parsed.videoId,
          format: input.format,
          quality: input.quality,
          durationSeconds:
            metadata.durationSeconds > 0 ? metadata.durationSeconds : undefined
        });
        audioAnalysis = audioResult.audioAnalysis;
        download = audioResult.download;
        logs.push(t.server.logs.audioDone);
        logger.info("audio_processing.success", { videoId: parsed.videoId });

        if (audioAnalysis.error) {
          const warningCode = audioAnalysis.errorCode ?? "AUDIO_ANALYSIS_FAILED";
          warnings.push(
            getWarningMessage(warningCode, locale) ?? t.server.warnings.audioAnalysisFailed
          );
          warningCodes.push(warningCode);
          logs.push(t.server.logs.audioAnalysisFailed);
        } else {
          logs.push(
            t.server.logs.audioResult(
              `${audioAnalysis.bpm ?? "none"}`,
              `${audioAnalysis.key ?? "none"}`
            )
          );
        }
      } catch (audioError) {
        const publicAudioError = getPublicError(audioError);
        logger.warn("audio_processing.failed", {
          videoId: parsed.videoId,
          code: publicAudioError.code,
          status: publicAudioError.status
        });
        const localizedAudioError =
          getWarningMessage(publicAudioError.code, locale) ??
          getErrorMessage(
            publicAudioError.code,
            locale,
            publicAudioError.message
          );
        warnings.push(
          publicAudioError.code === "INTERNAL_ERROR"
            ? t.server.warnings.audioProcessingFailed
            : localizedAudioError
        );
        warningCodes.push(publicAudioError.code);
        logs.push(t.server.logs.audioFailed(publicAudioError.code));
      }
    }

    const recommendation = buildRecommendation(textAnalysis, audioAnalysis, t.server.recommendation);
    logger.info("recommendation.success", {
      videoId: parsed.videoId,
      bpmFound: Boolean(recommendation.bpm.value),
      keyFound: Boolean(recommendation.key.value)
    });

    if (download) {
      const filename = buildDownloadFilename({
        bpm: recommendation.bpm.value,
        key: recommendation.key.value,
        title: metadata.title,
        format: input.format,
        videoId: parsed.videoId
      });
      updateDownloadFilename(download.fileId, filename);
      download = {
        ...download,
        filename
      };
    }

    const response: AnalyzeSuccessResponse = {
      ok: true,
      metadata,
      commentsFetched: comments.length,
      commentWarning: commentWarning ? t.server.commentWarning : undefined,
      textAnalysis,
      audioAnalysis,
      recommendation,
      download,
      warnings,
      warningCodes,
      logs
    };

    return NextResponse.json(response);
  } catch (error) {
    const locale = normalizeLocale(
      typeof payload === "object" && payload !== null && "locale" in payload
        ? payload.locale
        : undefined
    );
    const publicError = getPublicError(error);
    logger.warn("analyze.failed", {
      code: publicError.code,
      status: publicError.status
    });
    return NextResponse.json(
      {
        ok: false,
        code: publicError.code,
        message: getErrorMessage(publicError.code, locale, publicError.message)
      },
      { status: publicError.status }
    );
  }
}
