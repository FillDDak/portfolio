import { cookies } from "next/headers";
import { connection } from "next/server";
import { isBot } from "@/lib/analytics/classify";
import { recordContentEvent } from "@/lib/analytics/record";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getSharedRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { readStored } from "@/lib/upload/storage";

/**
 * PDF 열람·다운로드 횟수를 센다. 봇, 로그인한 관리자, 이어받기(Range) 요청은 세지 않고,
 * 같은 IP 가 30분 안에 다시 열면 한 번으로 친다(IP 는 메모리에서 중복 확인에만 쓰고 저장하지 않는다).
 * 집계에 실패해도 파일은 그대로 내보낸다.
 */
async function countPdfOpen(request: Request, kind: "view" | "download") {
  try {
    if (request.headers.has("range")) return;
    if (isBot(request.headers.get("user-agent"))) return;
    const session = await readSessionToken((await cookies()).get(SESSION_COOKIE_NAME)?.value);
    if (session) return;
    const ip = getClientIp(request.headers, getEnv().TRUSTED_PROXY_HOPS);
    const limiter = getSharedRateLimiter("pdf-open", { limit: 1, windowMs: 30 * 60_000 });
    if (!limiter.hit(`${kind}:${ip}`).allowed) return;
    await recordContentEvent({ event: "pdf", target: kind });
  } catch (error) {
    console.error("[resume] PDF 열람 집계 실패", error);
  }
}

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
  await countPdfOpen(request, download ? "download" : "view");
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
