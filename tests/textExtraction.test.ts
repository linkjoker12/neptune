import { describe, expect, it } from "vitest";
import { extractBpmEvidence, extractKeyEvidence, extractTextAnalysis } from "@/lib/textExtraction";
import type { YouTubeMetadata } from "@/lib/types";

const baseMetadata: YouTubeMetadata = {
  videoId: "dQw4w9WgXcQ",
  title: "Dark Trap Type Beat - 150 BPM - F# minor",
  channelTitle: "neptune test",
  description: "Tempo: 150. Key: F# minor. Free for written permission holders.",
  publishedAt: "2026-01-01T00:00:00Z",
  thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  duration: "PT3M10S",
  durationSeconds: 190
};

describe("text extraction", () => {
  it("extracts BPM candidates from common patterns", () => {
    const evidence = extractBpmEvidence("Tempo: 140, also 140bpm", "description");
    expect(evidence.map((item) => item.value)).toContain(140);
  });

  it("extracts normalized key candidates", () => {
    const evidence = extractKeyEvidence("Key: F# minor / C#m", "title");
    expect(evidence.map((item) => item.normalizedValue)).toEqual(
      expect.arrayContaining(["F# minor", "C# minor"])
    );
  });

  it("extracts compact producer key spellings", () => {
    const evidence = extractKeyEvidence(
      "Key : Cmaj, Cmajor beat, F#minor melody, Bbmin hook",
      "description"
    );
    expect(evidence.map((item) => item.normalizedValue)).toEqual(
      expect.arrayContaining(["C major", "F# minor", "Bb minor"])
    );
  });

  it("extracts producer key spellings with context labels", () => {
    const evidence = extractKeyEvidence(
      "Key=Cminor / key - F#minor / scale: A minor / in Cmajor / Abmaj / G#m",
      "description"
    );

    expect(evidence.map((item) => item.normalizedValue)).toEqual(
      expect.arrayContaining([
        "C minor",
        "F# minor",
        "A minor",
        "C major",
        "Ab major",
        "G# minor"
      ])
    );
  });

  it("does not infer key from isolated letters or prose", () => {
    const evidence = extractKeyEvidence(
      "A+ work. W beat. I came back in 2024. comment by user C. this is a minor issue.",
      "comment"
    );

    expect(evidence).toHaveLength(0);
  });

  it("weights title evidence above repeated weaker comments", () => {
    const analysis = extractTextAnalysis(baseMetadata, [
      { id: "1", text: "sounds like 145 bpm to me" },
      { id: "2", text: "145 tempo maybe" }
    ]);

    expect(analysis.bpm.value).toBe(150);
    expect(analysis.key.value).toBe("F# minor");
    expect(analysis.bpm.confidence).toBeGreaterThan(60);
  });
});
