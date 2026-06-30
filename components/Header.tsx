import type { Locale, Messages } from "@/lib/i18n";
import { LanguageToggle } from "./LanguageToggle";

interface HeaderProps {
  locale: Locale;
  messages: Messages;
  onLocaleChange: (locale: Locale) => void;
}

export function Header({ locale, messages, onLocaleChange }: HeaderProps) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-end px-5 py-3 sm:px-8 sm:py-4">
      <LanguageToggle
        locale={locale}
        messages={messages}
        onLocaleChange={onLocaleChange}
      />
    </header>
  );
}
