import { scoreCandidates } from "./confidence";
import type {
  CommentItem,
  EvidenceSource,
  ExtractionEvidence,
  TextAnalysis,
  YouTubeMetadata
} from "./types";

const sourceWeights: Record<EvidenceSource, number> = {
  title: 6,
  description: 3.5,
  comment: 1.2
};

const bpmPatterns = [
  /\b(?:bpm|tempo)\s*[:=~-]?\s*(\d{2,3})\b/gi,
  /\b(\d{2,3})\s*(?:bpm|tempo)\b/gi
];

const qualityPattern = "major|minor|maj|min|Major|Minor|Maj|Min";

const keyPatterns = [
  /\b(?:key|scale)\s*[:=~-]?\s*([A-Ga-g])\s*([#b♭]?)(?:\s*|-)?(major|minor|maj|min|m)\b/gi,
  /\bin\s+([A-Ga-g])\s*([#b♭]?)(?:\s*|-)?(major|minor|maj|min|m)\b/gi,
  new RegExp(`(?:^|[^A-Za-z])([A-G])\\s*([#b♭]?)(?:\\s+|-)(${qualityPattern})\\b`, "g"),
  new RegExp(`(?:^|[^A-Za-z])([A-G])([#b♭]?)(${qualityPattern})\\b`, "g"),
  /(?:^|[^A-Za-z])([A-G])([#b♭]?)m\b/g
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function makeSnippet(text: string, matchText: string) {
  const normalized = normalizeWhitespace(text);
  const index = normalized.toLowerCase().indexOf(matchText.toLowerCase());

  if (index === -1) {
    return normalized.slice(0, 140);
  }

  const start = Math.max(0, index - 54);
  const end = Math.min(normalized.length, index + matchText.length + 54);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalized.length ? "..." : "";
  return `${prefix}${normalized.slice(start, end)}${suffix}`;
}

function uniqueEvidence<TValue extends number | string>(
  items: ExtractionEvidence<TValue>[]
) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.source}:${item.normalizedValue}:${item.snippet}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isValidBpm(value: number) {
  return Number.isFinite(value) && value >= 40 && value <= 240;
}

export function extractBpmEvidence(text: string, source: EvidenceSource) {
  const evidence: ExtractionEvidence<number>[] = [];

  for (const pattern of bpmPatterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const bpm = Number.parseInt(match[1], 10);
      if (!isValidBpm(bpm)) {
        continue;
      }

      evidence.push({
        kind: "bpm",
        value: bpm,
        normalizedValue: `${bpm}`,
        source,
        snippet: makeSnippet(text, match[0]),
        weight: sourceWeights[source]
      });
    }
  }

  return uniqueEvidence(evidence);
}

function normalizeKey(note: string, accidental = "", quality = "m") {
  const normalizedAccidental = accidental.replace("♭", "b");
  const normalizedQuality = quality.toLowerCase();
  const mode =
    normalizedQuality === "major" || normalizedQuality === "maj" ? "major" : "minor";
  const normalizedNote = `${note[0].toUpperCase()}${note.slice(1).toLowerCase()}`;
  return `${normalizedNote}${normalizedAccidental} ${mode}`;
}

export function extractKeyEvidence(text: string, source: EvidenceSource) {
  const evidence: ExtractionEvidence<string>[] = [];

  for (const pattern of keyPatterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const key = normalizeKey(match[1], match[2] ?? "", match[3]);

      evidence.push({
        kind: "key",
        value: key,
        normalizedValue: key,
        source,
        snippet: makeSnippet(text, match[0]),
        weight: sourceWeights[source]
      });
    }
  }

  return uniqueEvidence(evidence);
}

export function extractTextAnalysis(
  metadata: YouTubeMetadata,
  comments: CommentItem[]
): TextAnalysis {
  const bpmEvidence = [
    ...extractBpmEvidence(metadata.title, "title"),
    ...extractBpmEvidence(metadata.description, "description"),
    ...comments.flatMap((comment) => extractBpmEvidence(comment.text, "comment"))
  ];

  const keyEvidence = [
    ...extractKeyEvidence(metadata.title, "title"),
    ...extractKeyEvidence(metadata.description, "description"),
    ...comments.flatMap((comment) => extractKeyEvidence(comment.text, "comment"))
  ];

  return {
    bpm: scoreCandidates(bpmEvidence),
    key: scoreCandidates(keyEvidence)
  };
}
