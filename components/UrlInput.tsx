"use client";

import { Loader2, Play, X } from "lucide-react";
import type { Messages } from "@/lib/i18n";
import type { AudioFormat, AudioQuality } from "@/lib/types";
import { FormatSelector, getQualityOptions } from "./FormatSelector";
import { RightsCheckbox } from "./RightsCheckbox";

interface UrlInputProps {
  url: string;
  format: AudioFormat;
  quality: AudioQuality;
  rightsConfirmed: boolean;
  isLoading: boolean;
  messages: Messages;
  onUrlChange: (url: string) => void;
  onFormatChange: (format: AudioFormat) => void;
  onQualityChange: (quality: AudioQuality) => void;
  onRightsChange: (checked: boolean) => void;
  onSubmit: () => void;
}

export function UrlInput({
  url,
  format,
  quality,
  rightsConfirmed,
  isLoading,
  messages,
  onUrlChange,
  onFormatChange,
  onQualityChange,
  onRightsChange,
  onSubmit
}: UrlInputProps) {
  const canSubmit = url.trim().length > 0 && rightsConfirmed && !isLoading;
  const hasUrl = url.length > 0;

  function handleFormatChange(nextFormat: AudioFormat) {
    onFormatChange(nextFormat);
    const options = getQualityOptions(nextFormat);
    if (!options.includes(quality)) {
      onQualityChange(options[0]);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-5 sm:px-8" aria-labelledby="analyze-form-title">
      <div className="card-surface p-4 sm:p-5">
        <h2 id="analyze-form-title" className="sr-only">
          {messages.form.title}
        </h2>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_max-content]">
            <label className="sr-only" htmlFor="youtube-url">
              {messages.form.urlLabel}
            </label>
            <div className="relative">
              <input
                id="youtube-url"
                value={url}
                onChange={(event) => onUrlChange(event.target.value)}
                placeholder={messages.form.urlPlaceholder}
                className="focus-ring h-14 w-full rounded-lg border border-slate-200 bg-white px-4 pr-11 text-base text-slate-950 shadow-inner placeholder:text-slate-400"
                aria-describedby="url-help"
              />
              {hasUrl ? (
                <button
                  type="button"
                  aria-label={messages.form.clearUrl}
                  onClick={() => onUrlChange("")}
                  className="focus-ring absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <RightsCheckbox
              checked={rightsConfirmed}
              label={messages.form.rights}
              onChange={onRightsChange}
            />
          </div>
          <p id="url-help" className="sr-only">
            {messages.form.urlHelp}
          </p>
          <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <FormatSelector
              format={format}
              quality={quality}
              messages={messages}
              onFormatChange={handleFormatChange}
              onQualityChange={onQualityChange}
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              {messages.form.submit}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
