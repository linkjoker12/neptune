import type { AudioFormat, AudioQuality } from "@/lib/types";
import type { Messages } from "@/lib/i18n";
import { ChevronDown } from "lucide-react";

interface FormatSelectorProps {
  format: AudioFormat;
  quality: AudioQuality;
  messages: Messages;
  onFormatChange: (format: AudioFormat) => void;
  onQualityChange: (quality: AudioQuality) => void;
}

const formatOptions: AudioFormat[] = ["mp3", "wav", "m4a", "flac", "ogg"];

const qualityOptions: Record<AudioFormat, AudioQuality[]> = {
  mp3: ["128k", "192k", "320k"],
  wav: ["lossless"],
  m4a: ["128k", "192k", "256k"],
  flac: ["lossless"],
  ogg: ["128k", "192k", "320k"]
};

export function getQualityOptions(format: AudioFormat) {
  return qualityOptions[format];
}

export function FormatSelector({
  format,
  quality,
  messages,
  onFormatChange,
  onQualityChange
}: FormatSelectorProps) {
  const activeQualityOptions = getQualityOptions(format);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {messages.form.formatLabel}
        <span className="relative">
          <select
            value={format}
            onChange={(event) => onFormatChange(event.target.value as AudioFormat)}
            className="focus-ring h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-11 text-sm normal-case tracking-normal text-slate-950 shadow-inner"
          >
            {formatOptions.map((option) => (
              <option key={option} value={option}>
                {option.toUpperCase()}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
        </span>
      </label>
      <label className="grid gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {messages.form.qualityLabel}
        <span className="relative">
          <select
            value={quality}
            onChange={(event) => onQualityChange(event.target.value as AudioQuality)}
            className="focus-ring h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-11 text-sm normal-case tracking-normal text-slate-950 shadow-inner"
          >
            {activeQualityOptions.map((option) => (
              <option key={option} value={option}>
                {option === "lossless" ? "lossless" : option}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
        </span>
      </label>
    </div>
  );
}
