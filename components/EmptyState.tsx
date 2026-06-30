import type { Messages } from "@/lib/i18n";

interface EmptyStateProps {
  messages: Messages;
}

export function EmptyState({ messages }: EmptyStateProps) {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-5 sm:px-8">
      <p className="text-center text-xs leading-6 text-slate-500">
        {messages.empty.legalBody}
      </p>
    </section>
  );
}
