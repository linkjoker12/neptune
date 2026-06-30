interface RightsCheckboxProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

export function RightsCheckbox({ checked, label, onChange }: RightsCheckboxProps) {
  const lines = label.split("\n");

  return (
    <label className="flex min-h-14 w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 text-[clamp(0.72rem,2.45vw,0.875rem)] leading-tight text-slate-600 sm:gap-3 lg:w-[28rem] lg:max-w-[28rem]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-slate-300 bg-white text-sky-500 focus:ring-sky-400"
      />
      <span className="min-w-0 text-left">
        {lines.map((line) => (
          <span key={line} className="block whitespace-normal sm:whitespace-nowrap">
            {line}
          </span>
        ))}
      </span>
    </label>
  );
}
