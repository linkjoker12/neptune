import { describe, expect, it } from "vitest";
import { buildRecommendation, scoreCandidates } from "@/lib/confidence";
import type { ExtractionEvidence, TextAnalysis } from "@/lib/types";

function bpmEvidence(value: number, source: ExtractionEvidence<number>["source"], weight: number) {
  return {
    kind: "bpm",
    value,
    normalizedValue: `${value}`,
    source,
    snippet: `${value} BPM`,
    weight
  } satisfies ExtractionEvidence<number>;
}

function keyEvidence(value: string, source: ExtractionEvidence<string>["source"], weight: number) {
  return {
    kind: "key",
    value,
    normalizedValue: value,
    source,
    snippet: `Key: ${value}`,
    weight
  } satisfies ExtractionEvidence<string>;
}

describe("confidence", () => {
  it("scores repeated matching candidates higher", () => {
    const estimate = scoreCandidates([
      bpmEvidence(150, "title", 6),
      bpmEvidence(150, "description", 3.5),
      bpmEvidence(140, "comment", 1.2)
    ]);

    expect(estimate.value).toBe(150);
    expect(estimate.confidence).toBeGreaterThan(70);
    expect(estimate.alternatives[0].value).toBe(140);
  });

  it("prefers producer BPM when title text is compatible with audio", () => {
    const text = {
      bpm: {
        value: 150,
        confidence: 88,
        evidence: [bpmEvidence(150, "title", 6)],
        alternatives: []
      },
      key: {
        value: "F# minor",
        confidence: 82,
        evidence: [keyEvidence("F# minor", "title", 6)],
        alternatives: []
      }
    } satisfies TextAnalysis;

    const recommendation = buildRecommendation(text, {
      bpm: 142,
      bpmConfidence: 70,
      key: "F# minor",
      keyConfidence: 68
    });

    expect(recommendation.bpm.value).toBe(150);
    expect(recommendation.bpm.source).toBe("text");
    expect(recommendation.key.value).toBe("F# minor");
    expect(recommendation.key.source).toBe("text");
  });

  it("keeps audio BPM when comment-only text conflicts strongly", () => {
    const text = {
      bpm: {
        value: 150,
        confidence: 88,
        evidence: [
          bpmEvidence(150, "comment", 1.2),
          bpmEvidence(150, "comment", 1.2),
          bpmEvidence(150, "comment", 1.2)
        ],
        alternatives: []
      },
      key: {
        value: null,
        confidence: 0,
        evidence: [],
        alternatives: []
      }
    } satisfies TextAnalysis;

    const recommendation = buildRecommendation(text, {
      bpm: 116,
      bpmConfidence: 84,
      key: null,
      keyConfidence: 0
    });

    expect(recommendation.bpm.value).toBe(116);
    expect(recommendation.bpm.source).toBe("audio");
  });

  it("uses producer BPM when audio is a half-time match", () => {
    const text = {
      bpm: {
        value: 150,
        confidence: 84,
        evidence: [bpmEvidence(150, "description", 3.5)],
        alternatives: []
      },
      key: {
        value: null,
        confidence: 0,
        evidence: [],
        alternatives: []
      }
    } satisfies TextAnalysis;

    const recommendation = buildRecommendation(text, {
      bpm: 75,
      bpmConfidence: 80,
      key: null,
      keyConfidence: 0
    });

    expect(recommendation.bpm.value).toBe(150);
    expect(recommendation.bpm.source).toBe("text");
  });

  it("prefers description BPM when audio is reasonably close", () => {
    const text = {
      bpm: {
        value: 116,
        confidence: 88,
        evidence: [bpmEvidence(116, "description", 3.5)],
        alternatives: []
      },
      key: {
        value: null,
        confidence: 0,
        evidence: [],
        alternatives: []
      }
    } satisfies TextAnalysis;

    const recommendation = buildRecommendation(text, {
      bpm: 113,
      bpmConfidence: 82,
      key: null,
      keyConfidence: 0
    });

    expect(recommendation.bpm.value).toBe(116);
    expect(recommendation.bpm.source).toBe("text");
  });

  it("prefers description key over a conflicting audio estimate", () => {
    const text = {
      bpm: {
        value: null,
        confidence: 0,
        evidence: [],
        alternatives: []
      },
      key: {
        value: "C major",
        confidence: 88,
        evidence: [keyEvidence("C major", "description", 3.5)],
        alternatives: []
      }
    } satisfies TextAnalysis;

    const recommendation = buildRecommendation(text, {
      bpm: null,
      bpmConfidence: 0,
      key: "A minor",
      keyConfidence: 78
    });

    expect(recommendation.key.value).toBe("C major");
    expect(recommendation.key.source).toBe("text");
  });
});
