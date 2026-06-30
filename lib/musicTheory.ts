const camelotMap: Record<string, string> = {
  "Ab minor": "1A",
  "G# minor": "1A",
  "Eb minor": "2A",
  "D# minor": "2A",
  "Bb minor": "3A",
  "A# minor": "3A",
  "F minor": "4A",
  "C minor": "5A",
  "G minor": "6A",
  "D minor": "7A",
  "A minor": "8A",
  "E minor": "9A",
  "B minor": "10A",
  "F# minor": "11A",
  "Gb minor": "11A",
  "C# minor": "12A",
  "Db minor": "12A",
  "B major": "1B",
  "F# major": "2B",
  "Gb major": "2B",
  "Db major": "3B",
  "C# major": "3B",
  "Ab major": "4B",
  "G# major": "4B",
  "Eb major": "5B",
  "D# major": "5B",
  "Bb major": "6B",
  "A# major": "6B",
  "F major": "7B",
  "C major": "8B",
  "G major": "9B",
  "D major": "10B",
  "A major": "11B",
  "E major": "12B"
};

export function getCamelotNotation(key: string | null | undefined) {
  if (!key) {
    return null;
  }

  return camelotMap[key] ?? null;
}

export function getTempoRange(values: Array<number | null | undefined>) {
  const bpms = values
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .map((value) => Math.round(value));

  if (bpms.length === 0) {
    return null;
  }

  const low = Math.min(...bpms);
  const high = Math.max(...bpms);
  return { low, high };
}
