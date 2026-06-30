"use client";

import { useEffect, useState } from "react";
import {
  getMessages,
  localeStorageKey,
  normalizeLocale,
  type Locale
} from "@/lib/i18n";
import type {
  AnalyzeResponse,
  AnalyzeSuccessResponse,
  AudioFormat,
  AudioQuality
} from "@/lib/types";
import { AnalysisResult } from "./AnalysisResult";
import { EmptyState } from "./EmptyState";
import { ErrorCard } from "./ErrorCard";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { LoadingProgress } from "./LoadingProgress";
import { UrlInput } from "./UrlInput";

export function NeptuneApp() {
  const [locale, setLocale] = useState<Locale>("en");
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<AudioFormat>("mp3");
  const [quality, setQuality] = useState<AudioQuality>("192k");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<AnalyzeSuccessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messages = getMessages(locale);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(localeStorageKey);
    const nextLocale = normalizeLocale(storedLocale ?? window.navigator.language);
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  function handleLocaleChange(nextLocale: Locale) {
    setLocale(nextLocale);
    window.localStorage.setItem(localeStorageKey, nextLocale);
    document.documentElement.lang = nextLocale;
  }

  useEffect(() => {
    if (!isLoading) {
      setActiveStep(0);
      return;
    }

    const timer = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, 4));
    }, 1300);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, format, quality, rightsConfirmed, locale })
      });
      const payload = (await response.json()) as AnalyzeResponse;

      if (!payload.ok) {
        setError(payload.message);
        return;
      }

      setResult(payload);
    } catch {
      setError(messages.error.network);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen pb-14">
      <Header
        locale={locale}
        messages={messages}
        onLocaleChange={handleLocaleChange}
      />
      <Hero messages={messages} />
      <UrlInput
        url={url}
        format={format}
        quality={quality}
        rightsConfirmed={rightsConfirmed}
        isLoading={isLoading}
        messages={messages}
        onUrlChange={setUrl}
        onFormatChange={setFormat}
        onQualityChange={setQuality}
        onRightsChange={setRightsConfirmed}
        onSubmit={handleSubmit}
      />
      {isLoading ? (
        <LoadingProgress activeStep={activeStep} messages={messages} />
      ) : null}
      {error ? <ErrorCard message={error} messages={messages} /> : null}
      {result ? <AnalysisResult result={result} messages={messages} /> : null}
      {!isLoading && !error && !result ? <EmptyState messages={messages} /> : null}
    </main>
  );
}
