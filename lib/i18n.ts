import { en } from "./messages/en";
import { ko } from "./messages/ko";

export const messages = { ko, en } as const;

export type Locale = keyof typeof messages;
export type Messages = (typeof messages)[Locale];

export const localeStorageKey = "neptune.locale";

export function normalizeLocale(value: unknown): Locale {
  if (typeof value !== "string") {
    return "en";
  }

  const normalized = value.toLowerCase();
  if (normalized === "ko" || normalized.startsWith("ko-")) {
    return "ko";
  }

  return "en";
}

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}

export function getErrorMessage(code: string, locale: Locale, fallback?: string) {
  const localized =
    messages[locale].server.errors[code as keyof Messages["server"]["errors"]];
  return localized ?? fallback ?? messages[locale].server.errors.INTERNAL_ERROR;
}

export function getWarningMessage(code: string, locale: Locale) {
  return messages[locale].result.warningMessages[
    code as keyof Messages["result"]["warningMessages"]
  ];
}
