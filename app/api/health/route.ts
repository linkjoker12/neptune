import { NextResponse } from "next/server";
import { getAudioToolHealth } from "@/lib/audioJob";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeTools = url.searchParams.get("tools") === "1";

  if (!includeTools) {
    return NextResponse.json({
      status: "ok",
      service: "neptune"
    });
  }

  const tools = await getAudioToolHealth();

  return NextResponse.json({
    status: "ok",
    service: "neptune",
    checks: {
      ffmpeg: tools.ffmpeg ? "ok" : "unavailable",
      python: tools.python ? "ok" : "unavailable",
      ytDlp: tools.ytDlp ? "ok" : "unavailable",
      audioWorker: tools.audioWorker ? "ok" : "unavailable"
    },
    dependencies: {
      ffmpeg: tools.ffmpeg,
      python: tools.python,
      ytDlp: tools.ytDlp,
      audioWorker: tools.audioWorker
    }
  });
}
