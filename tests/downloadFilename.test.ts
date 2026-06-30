import { describe, expect, it } from "vitest";
import { buildContentDisposition, buildDownloadFilename } from "@/lib/downloadFilename";

describe("download filename", () => {
  it("builds a BPM and key filename", () => {
    expect(
      buildDownloadFilename({
        bpm: 150,
        key: "F# minor",
        title: "Respawn",
        format: "mp3"
      })
    ).toBe("[neptune][150-F#_minor]Respawn.mp3");
  });

  it("uses unknown BPM when BPM is missing", () => {
    expect(
      buildDownloadFilename({
        bpm: null,
        key: "C minor",
        title: "Dark Beat",
        format: "wav"
      })
    ).toBe("[neptune][unknown-C_minor]Dark Beat.wav");
  });

  it("uses unknown key when key is missing", () => {
    expect(
      buildDownloadFilename({
        bpm: 140,
        key: null,
        title: "Trap Beat",
        format: "m4a"
      })
    ).toBe("[neptune][140-unknown]Trap Beat.m4a");
  });

  it("uses unknown values when BPM and key are missing", () => {
    expect(
      buildDownloadFilename({
        bpm: null,
        key: null,
        title: "Sample Beat Title",
        format: "ogg"
      })
    ).toBe("[neptune][unknown-unknown]Sample Beat Title.ogg");
  });

  it("keeps title spaces as the original YouTube title spacing", () => {
    expect(
      buildDownloadFilename({
        bpm: 150,
        key: "F# minor",
        title: "Jpop x Digicore Type Beat - Respawn",
        format: "mp3"
      })
    ).toBe("[neptune][150-F#_minor]Jpop x Digicore Type Beat - Respawn.mp3");
  });

  it("removes free promo tokens from YouTube titles", () => {
    expect(
      buildDownloadFilename({
        bpm: 150,
        key: "F# minor",
        title: "[FREE] Jpop x Digicore Type Beat - Respawn",
        format: "mp3"
      })
    ).toBe("[neptune][150-F#_minor]Jpop x Digicore Type Beat - Respawn.mp3");

    expect(
      buildDownloadFilename({
        bpm: 140,
        key: "C minor",
        title: "FREE - Dark Trap Type Beat (free)",
        format: "wav"
      })
    ).toBe("[neptune][140-C_minor]Dark Trap Type Beat.wav");
  });

  it("removes unsafe filename characters", () => {
    const filename = buildDownloadFilename({
      bpm: 150,
      key: "F# minor",
      title: String.raw`Bad / \ : * ? " < > | Title`,
      format: "mp3"
    });

    expect(filename).toBe("[neptune][150-F#_minor]Bad Title.mp3");
    expect(filename).not.toMatch(/[\/\\:*?"<>|]/);
  });

  it("keeps Korean title text and spaces", () => {
    expect(
      buildDownloadFilename({
        bpm: 140,
        key: "C major",
        title: "감성 타입 비트",
        format: "mp3"
      })
    ).toBe("[neptune][140-C_major]감성 타입 비트.mp3");
  });

  it("limits overly long filenames", () => {
    const filename = buildDownloadFilename({
      bpm: 140,
      key: "C minor",
      title: "Long Beat ".repeat(60),
      format: "flac"
    });

    expect(filename.length).toBeLessThanOrEqual(180);
    expect(filename.endsWith(".flac")).toBe(true);
  });

  it("falls back to videoId when title is empty", () => {
    expect(
      buildDownloadFilename({
        bpm: null,
        key: null,
        title: "",
        format: "mp3",
        videoId: "abc123"
      })
    ).toBe("[neptune][unknown-unknown]abc123.mp3");
  });

  it("builds an RFC 5987 download header", () => {
    const filename = "[neptune][140-C_major]감성 타입 비트.mp3";
    const header = buildContentDisposition(filename);

    expect(header).toContain("attachment;");
    expect(header).toContain("filename=");
    expect(header).toContain("filename*=UTF-8''");
    expect(header).toContain(encodeURIComponent(filename));
  });
});
