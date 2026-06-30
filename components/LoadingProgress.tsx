import { Loader2 } from "lucide-react";
import type { Messages } from "@/lib/i18n";

interface LoadingProgressProps {
  activeStep: number;
  messages: Messages;
}

export function LoadingProgress({ activeStep, messages }: LoadingProgressProps) {
  const steps = messages.progress.steps;
  const currentStep = steps[Math.min(activeStep, steps.length - 1)];

  return (
    <section className="mx-auto max-w-5xl px-5 pt-4 sm:px-8" aria-live="polite">
      <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-sky-600" aria-hidden="true" />
        <span>{currentStep}</span>
      </div>
    </section>
  );
}
