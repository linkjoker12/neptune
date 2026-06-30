import type {
  AudioAnalysis,
  CandidateEstimate,
  ExtractionEvidence,
  Recommendation,
  TextAnalysis
} from "./types";

interface RecommendationReasonMessages {
  noBpm: string;
  noKey: string;
  textConfidence: (confidence: number) => string;
  audioConfidence: (confidence: number) => string;
  closeBpm: string;
  halfDoubleBpm: string;
  highTextBpm: string;
  weakTextBpm: string;
  matchedKey: string;
  highTextKey: string;
  weakTextKey: string;
}

const defaultRecommendationMessages: RecommendationReasonMessages = {
  noBpm: "No clear BPM candidate was found.",
  noKey: "No clear Key candidate was found.",
  textConfidence: (confidence) => `Text confidence ${confidence}%`,
  audioConfidence: (confidence) => `Audio confidence ${confidence}%`,
  closeBpm: "The text and audio BPM candidates are within ±2 BPM.",
  halfDoubleBpm:
    "The measured audio tempo matches the producer BPM as a half-time or double-time value.",
  highTextBpm: "The title/description BPM confidence is high.",
  weakTextBpm:
    "Audio BPM was preferred because text candidates conflict or have low confidence.",
  matchedKey: "Text and audio Key candidates match.",
  highTextKey: "The title/description Key confidence is high.",
  weakTextKey: "Audio estimated key was preferred because text confidence is low."
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function scoreCandidates<TValue extends number | string>(
  evidence: ExtractionEvidence<TValue>[]
): CandidateEstimate<TValue> {
  if (evidence.length === 0) {
    return {
      value: null,
      confidence: 0,
      evidence: [],
      alternatives: []
    };
  }

  const groups = new Map<
    string,
    {
      value: TValue;
      normalizedValue: string;
      evidence: ExtractionEvidence<TValue>[];
      score: number;
    }
  >();

  for (const item of evidence) {
    const existing = groups.get(item.normalizedValue);
    if (existing) {
      existing.evidence.push(item);
      existing.score += item.weight;
    } else {
      groups.set(item.normalizedValue, {
        value: item.value,
        normalizedValue: item.normalizedValue,
        evidence: [item],
        score: item.weight
      });
    }
  }

  const scored = [...groups.values()].map((group) => {
    const sourceCount = new Set(group.evidence.map((item) => item.source)).size;
    const repeatBonus = Math.min(group.evidence.length - 1, 8) * 0.55;
    const sourceBonus = sourceCount * 0.85;
    const hasTitle = group.evidence.some((item) => item.source === "title");
    const score = group.score + repeatBonus + sourceBonus + (hasTitle ? 1.5 : 0);
    return { ...group, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const [top, runnerUp] = scored;
  const margin = runnerUp ? (top.score - runnerUp.score) / top.score : 1;
  const totalScore = scored.reduce((sum, group) => sum + group.score, 0);
  const dominance = top.score / totalScore;
  const hasTitle = top.evidence.some((item) => item.source === "title");
  const hasDescription = top.evidence.some((item) => item.source === "description");
  const sourceQuality = hasTitle ? 16 : hasDescription ? 9 : 2;
  const conflictPenalty = runnerUp && margin < 0.22 ? 14 : runnerUp && margin < 0.4 ? 7 : 0;
  const confidence = clamp(
    Math.round(24 + dominance * 42 + margin * 22 + sourceQuality - conflictPenalty),
    30,
    96
  );

  return {
    value: top.value,
    confidence,
    evidence: top.evidence,
    alternatives: scored.slice(1, 4).map((group) => ({
      value: group.value,
      confidence: clamp(Math.round((group.score / top.score) * confidence), 1, 90),
      evidenceCount: group.evidence.length
    }))
  };
}

function audioBpmConfidence(audio?: AudioAnalysis) {
  return audio?.bpm ? audio.bpmConfidence : 0;
}

function audioKeyConfidence(audio?: AudioAnalysis) {
  return audio?.key ? audio.keyConfidence : 0;
}

function roundBpm(value: number) {
  return Math.round(value);
}

function isCloseBpm(a: number, b: number, tolerance = 2) {
  return Math.abs(roundBpm(a) - roundBpm(b)) <= tolerance;
}

function hasSourceEvidence<TValue extends number | string>(
  estimate: CandidateEstimate<TValue>,
  source: ExtractionEvidence<TValue>["source"]
) {
  return estimate.evidence.some((item) => item.source === source);
}

function hasProducerEvidence<TValue extends number | string>(
  estimate: CandidateEstimate<TValue>
) {
  return hasSourceEvidence(estimate, "title") || hasSourceEvidence(estimate, "description");
}

function isHalfOrDoubleTimeMatch(audioValue: number, textValue: number) {
  return (
    isCloseBpm(audioValue * 2, textValue, 3) ||
    isCloseBpm(audioValue / 2, textValue, 3) ||
    isCloseBpm(audioValue, textValue * 2, 3) ||
    isCloseBpm(audioValue, textValue / 2, 3)
  );
}

function isProducerBpmCompatible(audioValue: number, textValue: number) {
  return isCloseBpm(audioValue, textValue, 8) || isHalfOrDoubleTimeMatch(audioValue, textValue);
}

function isSevereBpmConflict(audioValue: number, textValue: number) {
  return !isCloseBpm(audioValue, textValue, 14) && !isHalfOrDoubleTimeMatch(audioValue, textValue);
}

function recommendBpm(
  text: TextAnalysis,
  audio: AudioAnalysis | undefined,
  reasonMessages: RecommendationReasonMessages
): Recommendation["bpm"] {
  const textValue = text.bpm.value;
  const audioValue = audio?.bpm ?? null;
  const hasProducerBpm = hasProducerEvidence(text.bpm);

  if (textValue === null && audioValue === null) {
    return {
      value: null,
      source: "none",
      reason: reasonMessages.noBpm
    };
  }

  if (textValue !== null && audioValue === null) {
    return {
      value: textValue,
      source: "text",
      reason: reasonMessages.textConfidence(text.bpm.confidence)
    };
  }

  if (textValue === null && audioValue !== null) {
    return {
      value: roundBpm(audioValue),
      source: "audio",
      reason: reasonMessages.audioConfidence(audioBpmConfidence(audio))
    };
  }

  if (
    hasProducerBpm &&
    text.bpm.confidence >= 60 &&
    isProducerBpmCompatible(audioValue as number, textValue as number)
  ) {
    return {
      value: textValue,
      source: "text",
      reason: reasonMessages.highTextBpm
    };
  }

  if (
    hasProducerBpm &&
    text.bpm.confidence >= 82 &&
    !isSevereBpmConflict(audioValue as number, textValue as number)
  ) {
    return {
      value: textValue,
      source: "text",
      reason: reasonMessages.highTextBpm
    };
  }

  if (isCloseBpm(textValue as number, audioValue as number)) {
    return {
      value: roundBpm(audioValue as number),
      source: "audio",
      reason: reasonMessages.closeBpm
    };
  }

  if (
    hasProducerBpm &&
    text.bpm.confidence >= 68 &&
    isHalfOrDoubleTimeMatch(audioValue as number, textValue as number)
  ) {
    return {
      value: textValue,
      source: "text",
      reason: reasonMessages.halfDoubleBpm
    };
  }

  if (text.bpm.confidence >= 78 && audioBpmConfidence(audio) < 55) {
    return {
      value: textValue,
      source: "text",
      reason: reasonMessages.highTextBpm
    };
  }

  return {
    value: roundBpm(audioValue as number),
    source: "audio",
    reason: reasonMessages.weakTextBpm
  };
}

function recommendKey(
  text: TextAnalysis,
  audio: AudioAnalysis | undefined,
  reasonMessages: RecommendationReasonMessages
): Recommendation["key"] {
  const textValue = text.key.value;
  const audioValue = audio?.key ?? null;
  const hasProducerKey = hasProducerEvidence(text.key);

  if (textValue === null && audioValue === null) {
    return {
      value: null,
      source: "none",
      reason: reasonMessages.noKey
    };
  }

  if (textValue !== null && audioValue === null) {
    return {
      value: textValue,
      source: "text",
      reason: reasonMessages.textConfidence(text.key.confidence)
    };
  }

  if (textValue === null && audioValue !== null) {
    return {
      value: audioValue,
      source: "audio",
      reason: reasonMessages.audioConfidence(audioKeyConfidence(audio))
    };
  }

  if (hasProducerKey && text.key.confidence >= 60) {
    return {
      value: textValue,
      source: "text",
      reason: reasonMessages.highTextKey
    };
  }

  if (textValue === audioValue) {
    return {
      value: audioValue,
      source: "audio",
      reason: reasonMessages.matchedKey
    };
  }

  if (text.key.confidence >= 78 && audioKeyConfidence(audio) < 70) {
    return {
      value: textValue,
      source: "text",
      reason: reasonMessages.highTextKey
    };
  }

  return {
    value: audioValue,
    source: "audio",
    reason: reasonMessages.weakTextKey
  };
}

export function buildRecommendation(
  text: TextAnalysis,
  audio?: AudioAnalysis,
  reasonMessages: RecommendationReasonMessages = defaultRecommendationMessages
): Recommendation {
  return {
    bpm: recommendBpm(text, audio, reasonMessages),
    key: recommendKey(text, audio, reasonMessages)
  };
}
