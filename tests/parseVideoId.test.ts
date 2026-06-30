import { describe, expect, it } from "vitest";
import { parseVideoId } from "@/lib/parseVideoId";

describe("parseVideoId", () => {
  it("extracts video ids from watch URLs", () => {
    expect(parseVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ").videoId).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("extracts video ids from URLs without a protocol", () => {
    expect(
      parseVideoId("youtube.com/watch?v=3uDX2d-3mg8&list=RDDDHSfS-_TY&index=3")
        .videoId
    ).toBe("3uDX2d-3mg8");
  });

  it("extracts video ids from short youtu.be URLs", () => {
    expect(parseVideoId("https://youtu.be/dQw4w9WgXcQ?t=15").videoId).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("extracts video ids from short URLs without a protocol", () => {
    expect(parseVideoId("youtu.be/dQw4w9WgXcQ?t=15").videoId).toBe("dQw4w9WgXcQ");
  });

  it("extracts video ids from Shorts URLs", () => {
    expect(parseVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ").videoId).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("rejects non-YouTube URLs", () => {
    expect(() => parseVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toThrow(
      "YouTube 링크만 분석할 수 있습니다."
    );
  });
});
