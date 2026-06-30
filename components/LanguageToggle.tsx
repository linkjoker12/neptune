"use client";

import type { Locale, Messages } from "@/lib/i18n";

interface LanguageToggleProps {
  locale: Locale;
  messages: Messages;
  onLocaleChange: (locale: Locale) => void;
}

const options: Locale[] = ["ko", "en"];

export function LanguageToggle({
  locale,
  messages,
  onLocaleChange
}: LanguageToggleProps) {
  return (
    <div
      className="inline-flex rounded-full border border-slate-200 bg-white/75 p-1 shadow-sm"
      role="group"
      aria-label={messages.header.languageLabel}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onLocaleChange(option)}
          className={`focus-ring min-h-8 rounded-full px-3 text-xs font-semibold transition ${
            locale === option
              ? "bg-slate-950 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          }`}
          aria-pressed={locale === option}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
