"use client";

import { ChevronDown, Download } from "lucide-react";
import type { Messages } from "@/lib/i18n";
import { getCamelotNotation, getTempoRange } from "@/lib/musicTheory";
import type { AnalyzeSuccessResponse, ExtractionEvidence } from "@/lib/types";

interface AnalysisResultProps {
  result: AnalyzeSuccessResponse;
  messages: Messages;
}

function displayValue(value: number | string | null | undefined, fallback = "-") {
  if (value === null || value === undefined) {
    return fallback;
  }

  return typeof value === "number" ? Math.round(value) : value;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${rest}`;
}

function getMetricSublabel(
  result: AnalyzeSuccessResponse,
  kind: "bpm" | "key",
  messages: Messages
) {
  const recommendation = result.recommendation[kind];
  if (recommendation.source === "text") {
    return `${messages.result.textBasis} · ${messages.result.confidence(
      result.textAnalysis[kind].confidence
    )}`;
  }

  if (recommendation.source === "audio") {
    const confidence =
      kind === "bpm"
        ? result.audioAnalysis?.bpmConfidence ?? 0
        : result.audioAnalysis?.keyConfidence ?? 0;
    return `${messages.result.audioBasis} · ${messages.result.confidence(confidence)}`;
  }

  return kind === "bpm"
    ? messages.result.recommendationReasons.noBpm
    : messages.result.recommendationReasons.noKey;
}

function MetricCard({
  label,
  value,
  sublabel,
  meta,
  secondary
}: {
  label: string;
  value: number | string | null;
  sublabel: string;
  meta?: string | null;
  secondary?: string | null;
}) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 text-5xl font-semibold tracking-normal text-slate-950">
        {displayValue(value)}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{sublabel}</p>
      {meta ? (
        <p className="mt-4 inline-flex rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
          {meta}
        </p>
      ) : null}
      {secondary ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">{secondary}</p>
      ) : null}
    </div>
  );
}

function SourceSnapshot({
  label,
  bpm,
  bpmConfidence,
  keyValue,
  keyConfidence,
  messages
}: {
  label: string;
  bpm: number | null | undefined;
  bpmConfidence?: number;
  keyValue: string | null | undefined;
  keyConfidence?: number;
  messages: Messages;
}) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-500">BPM</dt>
          <dd className="font-medium text-slate-950">
            {displayValue(bpm)}
            {typeof bpmConfidence === "number"
              ? ` · ${messages.result.confidence(bpmConfidence)}`
              : ""}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-500">Key</dt>
          <dd className="font-medium text-slate-950">
            {displayValue(keyValue)}
            {typeof keyConfidence === "number"
              ? ` · ${messages.result.confidence(keyConfidence)}`
              : ""}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function groupEvidence(evidence: ExtractionEvidence[]) {
  return evidence.reduce<Record<string, ExtractionEvidence[]>>((acc, item) => {
    acc[item.source] ??= [];
    acc[item.source].push(item);
    return acc;
  }, {});
}

function isCloseNumber(a: number, b: number, tolerance = 2) {
  return Math.abs(Math.round(a) - Math.round(b)) <= tolerance;
}

function getBpmAlternativeText(result: AnalyzeSuccessResponse, messages: Messages) {
  const recommendedBpm = result.recommendation.bpm.value;
  if (recommendedBpm === null) {
    return null;
  }

  const candidates: Array<{ bpm: number; confidence: number }> = [];

  if (
    result.audioAnalysis?.bpm &&
    result.recommendation.bpm.source === "text" &&
    result.audioAnalysis.bpmConfidence >= 55 &&
    !isCloseNumber(result.audioAnalysis.bpm, recommendedBpm)
  ) {
    candidates.push({
      bpm: Math.round(result.audioAnalysis.bpm),
      confidence: result.audioAnalysis.bpmConfidence
    });
  }

  for (const candidate of result.audioAnalysis?.bpmAlternatives ?? []) {
    if (candidate.confidence < 55 || isCloseNumber(candidate.bpm, recommendedBpm)) {
      continue;
    }

    candidates.push(candidate);
  }

  for (const candidate of result.textAnalysis.bpm.alternatives) {
    if (
      candidate.confidence < 60 ||
      isCloseNumber(candidate.value, recommendedBpm)
    ) {
      continue;
    }

    candidates.push({
      bpm: candidate.value,
      confidence: candidate.confidence
    });
  }

  const uniqueCandidates = candidates
    .sort((a, b) => b.confidence - a.confidence)
    .reduce<Array<{ bpm: number; confidence: number }>>((acc, candidate) => {
      if (!acc.some((item) => isCloseNumber(item.bpm, candidate.bpm))) {
        acc.push(candidate);
      }

      return acc;
    }, [])
    .slice(0, 3);

  if (uniqueCandidates.length === 0) {
    return null;
  }

  const values = uniqueCandidates
    .map((candidate) => `${candidate.bpm} BPM (${candidate.confidence}%)`)
    .join(", ");

  return `${messages.result.alternativeBpmLabel}: ${values}`;
}

function startDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function AnalysisResult({ result, messages }: AnalysisResultProps) {
  const evidence = [
    ...result.textAnalysis.bpm.evidence,
    ...result.textAnalysis.key.evidence
  ];
  const recommendedKey = result.recommendation.key.value;
  const camelot = getCamelotNotation(recommendedKey);
  const tempoRange = getTempoRange([
    result.recommendation.bpm.value,
    result.textAnalysis.bpm.value,
    result.audioAnalysis?.bpm
  ]);
  const visibleWarningCodes =
    result.warningCodes?.filter((code) => code !== "MISSING_YOUTUBE_API_KEY") ?? [];
  const warningMessages =
    visibleWarningCodes.length > 0
      ? visibleWarningCodes.map(
          (code) =>
            messages.result.warningMessages[
              code as keyof Messages["result"]["warningMessages"]
            ] ?? code
        )
      : result.warnings.filter((warning) => !warning.includes("YOUTUBE_API_KEY"));
  const groupedEvidence = groupEvidence(evidence);
  const duration = formatDuration(result.metadata.durationSeconds);
  const bpmAlternatives = getBpmAlternativeText(result, messages);

  return (
    <section className="mx-auto grid max-w-5xl gap-4 px-5 pt-5 sm:px-8">
      {warningMessages.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {warningMessages.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <div className="card-surface overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[160px_1fr]">
          <img
            src={result.metadata.thumbnail}
            alt=""
            className="h-full min-h-36 w-full object-cover"
          />
          <div className="flex flex-col justify-center p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {result.metadata.channelTitle}
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-slate-950">
              {result.metadata.title}
            </h2>
            {duration ? (
              <p className="mt-3 text-sm text-slate-500">{duration}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          label={messages.result.recommendedBpm}
          value={result.recommendation.bpm.value}
          sublabel={getMetricSublabel(result, "bpm", messages)}
          secondary={bpmAlternatives}
          meta={
            tempoRange
              ? messages.result.tempoRange(tempoRange.low, tempoRange.high)
              : null
          }
        />
        <MetricCard
          label={messages.result.recommendedKey}
          value={result.recommendation.key.value}
          sublabel={getMetricSublabel(result, "key", messages)}
          meta={
            camelot
              ? `${messages.result.camelot} ${camelot}`
              : messages.result.camelotUnavailable
          }
        />
      </div>

      {result.download ? (
        <button
          type="button"
          onClick={() => startDownload(result.download!.url, result.download!.filename)}
          className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
        >
          <Download className="h-5 w-5" aria-hidden="true" />
          {messages.result.download}
        </button>
      ) : (
        <p className="text-center text-sm leading-6 text-slate-500">
          {messages.result.noDownload}
        </p>
      )}

      <details className="card-surface group p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-slate-950">
          {messages.result.evidenceTitle}
          <ChevronDown className="h-5 w-5 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mt-5 grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <SourceSnapshot
              label={messages.result.textBasis}
              bpm={result.textAnalysis.bpm.value}
              bpmConfidence={result.textAnalysis.bpm.confidence}
              keyValue={result.textAnalysis.key.value}
              keyConfidence={result.textAnalysis.key.confidence}
              messages={messages}
            />
            <SourceSnapshot
              label={messages.result.audioBasis}
              bpm={result.audioAnalysis?.bpm}
              bpmConfidence={result.audioAnalysis?.bpmConfidence}
              keyValue={result.audioAnalysis?.key}
              keyConfidence={result.audioAnalysis?.keyConfidence}
              messages={messages}
            />
          </div>

          {evidence.length === 0 ? (
            <p className="text-sm text-slate-600">
              {messages.result.evidenceEmpty}
            </p>
          ) : (
            <div className="grid gap-3">
              {Object.entries(groupedEvidence).map(([source, items]) => (
                <div key={source} className="rounded-lg border border-slate-200/80 bg-white p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {messages.result.sourceLabels[
                      source as keyof Messages["result"]["sourceLabels"]
                    ] ?? source}
                  </p>
                  <div className="grid gap-2">
                    {items.map((item, index) => (
                      <p
                        key={`${item.normalizedValue}-${index}`}
                        className="text-sm leading-6 text-slate-700"
                      >
                        <span className="font-medium text-sky-700">
                          {item.normalizedValue}
                        </span>
                        <span className="text-slate-400"> · </span>
                        {item.snippet}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
