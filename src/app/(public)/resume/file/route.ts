import { connection } from "next/server";
import { db } from "@/lib/db";
import { readStored } from "@/lib/upload/storage";

const DOWNLOAD_NAME = "최현규_포트폴리오.pdf";

/**
 * PDF 포트폴리오 파일.
 *   /resume/file             브라우저 내장 뷰어로 보기
 *   /resume/file?download=1  "최현규_포트폴리오.pdf" 로 내려받기
 * 파일이 없으면 404.
 */
export async function GET(request: Request) {
  await connection();
  const profile = await db.profile.findUnique({ where: { id: 1 }, select: { resumeFile: true } });
  const stored = profile?.resumeFile ? await readStored("resume", profile.resumeFile) : null;
  if (!stored) {
    return new Response("Not Found", { status: 404 });
  }

  const download = new URL(request.url).searchParams.has("download");
  // 한글 파일명은 RFC 5987 형식(filename*)으로 보내고, 오래된 브라우저용 영문 이름도 함께 넣는다.
  const disposition = `${download ? "attachment" : "inline"}; filename="portfolio.pdf"; filename*=UTF-8''${encodeURIComponent(DOWNLOAD_NAME)}`;

  return new Response(new Uint8Array(stored.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(stored.size),
      "Content-Disposition": disposition,
      // 교체하면 바로 새 파일이 보이도록 매번 서버에 확인하게 한다.
      "Cache-Control": "no-cache",
      "Last-Modified": stored.modifiedAt.toUTCString(),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
