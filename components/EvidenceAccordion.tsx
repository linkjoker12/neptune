import { ChevronDown } from "lucide-react";
import type { Messages } from "@/lib/i18n";
import type { ExtractionEvidence } from "@/lib/types";

interface EvidenceAccordionProps {
  evidence: ExtractionEvidence[];
  messages: Messages;
}

export function EvidenceAccordion({ evidence, messages }: EvidenceAccordionProps) {
  const grouped = evidence.reduce<Record<string, ExtractionEvidence[]>>((acc, item) => {
    acc[item.source] ??= [];
    acc[item.source].push(item);
    return acc;
  }, {});

  return (
    <details className="card-surface group p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-slate-950">
        {messages.result.evidenceTitle}
        <ChevronDown className="h-5 w-5 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-4 grid gap-3">
        {evidence.length === 0 ? (
          <p className="text-sm text-slate-600">
            {messages.result.evidenceEmpty}
          </p>
        ) : (
          Object.entries(grouped).map(([source, items]) => (
            <div key={source} className="subtle-panel p-4">
              <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold uppercase text-slate-600">
                {messages.result.sourceLabels[
                  source as keyof Messages["result"]["sourceLabels"]
                ] ?? source}
              </div>
              <div className="grid gap-2">
                {items.map((item, index) => (
                  <p key={`${item.normalizedValue}-${index}`} className="text-sm leading-6 text-slate-700">
                    <span className="text-sky-600">{item.normalizedValue}</span>
                    <span className="text-slate-400"> · </span>
                    {item.snippet}
                  </p>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </details>
  );
}
