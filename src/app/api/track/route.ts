import { isBot } from "@/lib/analytics/classify";
import { getRealtimeTracker } from "@/lib/analytics/realtime";
import { recordPageView } from "@/lib/analytics/record";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { getSharedRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

/**
 * 공개 페이지가 보내는 방문 신호.
 *   { type: "view", path, referrer, utmSource }  조회 기록
 *   { type: "beat", sessionId }                  실시간 접속자용 하트비트(25초마다)
 *
 * 봇과 로그인한 관리자의 방문은 집계하지 않는다. 결과와 상관없이 항상 204 로 응답해서
 * 집계 여부를 밖에서 알 수 없게 한다.
 */
export async function POST(request: Request) {
  try {
    const userAgent = request.headers.get("user-agent") ?? "";
    if (isBot(userAgent)) return noContent();

    const env = getEnv();
    const ip = getClientIp(request.headers, env.TRUSTED_PROXY_HOPS);

    // 한 IP 가 신호를 과하게 보내는 것을 막는다(1분에 60회).
    const limiter = getSharedRateLimiter("track", { limit: 60, windowMs: 60_000 });
    if (!limiter.hit(`track:${ip}`).allowed) return noContent();

    const raw = await request.text();
    if (raw.length > 2000) return noContent();
    const body = JSON.parse(raw) as Record<string, unknown>;

    // 로그인한 관리자의 방문은 집계하지 않는다.
    const session = await readSessionToken(readCookie(request, SESSION_COOKIE_NAME));
    if (session) return noContent();

    if (body.type === "beat") {
      const sessionId = body.sessionId;
      if (typeof sessionId === "string" && /^[a-z0-9-]{16,40}$/i.test(sessionId)) {
        getRealtimeTracker().beat(sessionId);
      }
      return noContent();
    }

    if (body.type === "view") {
      await recordPageView({
        path: body.path,
        referrer: body.referrer,
        utmSource: body.utmSource,
        ip,
        userAgent,
      });
    }
    return noContent();
  } catch (error) {
    // 통계 수집 실패가 방문자 화면에 영향을 주면 안 된다.
    if (!(error instanceof SyntaxError)) console.error("[track] 기록 실패", error);
    return noContent();
  }
}
