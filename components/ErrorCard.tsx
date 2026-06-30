import { AlertTriangle } from "lucide-react";
import type { Messages } from "@/lib/i18n";

interface ErrorCardProps {
  message: string;
  messages: Messages;
}

export function ErrorCard({ message, messages }: ErrorCardProps) {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-6 sm:px-8" role="alert">
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-900 shadow-card">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-rose-950">{messages.error.title}</h2>
            <p className="mt-1 text-sm leading-6 text-rose-800">{message}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
