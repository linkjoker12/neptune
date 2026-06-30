import { NextResponse } from "next/server";
import { getDownloadStream } from "@/lib/audioJob";
import { buildContentDisposition } from "@/lib/downloadFilename";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json(
      {
        ok: false,
        code: "FILE_ID_REQUIRED",
        message: "다운로드 파일 ID가 필요합니다."
      },
      { status: 400 }
    );
  }

  const download = await getDownloadStream(fileId);

  if (!download) {
    return NextResponse.json(
      {
        ok: false,
        code: "DOWNLOAD_NOT_FOUND",
        message: "다운로드 파일이 만료되었거나 존재하지 않습니다."
      },
      { status: 404 }
    );
  }

  return new NextResponse(download.stream, {
    headers: {
      "Content-Type": download.mimeType,
      "Content-Length": `${download.sizeBytes}`,
      "Content-Disposition": buildContentDisposition(download.filename),
      "Cache-Control": "private, no-store"
    }
  });
}
