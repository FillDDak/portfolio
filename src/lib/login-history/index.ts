import "server-only";
import { db } from "@/lib/db";
import type { ClientInfo } from "@/lib/device/describe";
import { deviceIdOf, isPrivateIp, parseIpApiResponse, type GeoInfo } from "./parse";

export type LoginResult = "SUCCESS" | "FAILURE" | "LOCKED";

/** 로그인 기록 보관 기간 */
export const LOGIN_HISTORY_RETENTION_DAYS = 90;
/** 같은 IP 를 이 기간 안에 조회한 적이 있으면 외부에 다시 묻지 않고 그 결과를 쓴다. */
const GEO_REUSE_DAYS = 30;
const GEO_TIMEOUT_MS = 3_000;

/**
 * IP 의 대략적인 위치(국가·지역·도시·통신사)를 ip-api.com 에 묻는다. 실패하면 null.
 * - 무료(비상업적 용도) 주소라 HTTPS 가 아닌 HTTP 로 요청한다. 보내는 값은 IP 하나뿐이다.
 * - 1분에 45번까지라 로그인 기록에만 쓰고, 같은 IP 는 30일 동안 다시 묻지 않는다.
 * - 도시는 통신사 기준이라 실제 위치와 다를 수 있다(모바일은 특히 부정확).
 */
export async function lookupGeo(ip: string, fetchImpl: typeof fetch = fetch): Promise<GeoInfo | null> {
  try {
    const response = await fetchImpl(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,isp`,
      { signal: AbortSignal.timeout(GEO_TIMEOUT_MS), cache: "no-store" },
    );
    if (!response.ok) return null;
    return parseIpApiResponse(await response.json());
  } catch {
    return null;
  }
}

/**
 * 로그인 시도를 기록하고 위치를 채운다. 로그인 응답을 보낸 뒤(after) 호출하므로 로그인 속도에 영향이 없다.
 * 기록에 실패해도 로그인에는 영향이 없도록 오류는 로그만 남긴다.
 */
export async function recordLoginAttempt(input: {
  result: LoginResult;
  ip: string;
  userAgent: string;
  client?: ClientInfo;
}) {
  try {
    const isPrivate = isPrivateIp(input.ip);
    const row = await db.loginAttempt.create({
      data: {
        result: input.result,
        ip: input.ip.slice(0, 64),
        userAgent: input.userAgent.slice(0, 300),
        clientInfo: JSON.stringify(input.client ?? {}),
        deviceId: deviceIdOf(input.userAgent, input.client ?? {}),
        geoStatus: isPrivate ? "PRIVATE" : "PENDING",
      },
      select: { id: true },
    });
    if (isPrivate) return;

    const since = new Date(Date.now() - GEO_REUSE_DAYS * 24 * 60 * 60 * 1000);
    const known = await db.loginAttempt.findFirst({
      where: { ip: input.ip, geoStatus: "OK", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { country: true, region: true, city: true, isp: true },
    });
    const geo = known ?? (await lookupGeo(input.ip));
    await db.loginAttempt.update({
      where: { id: row.id },
      data: geo ? { ...geo, geoStatus: "OK" } : { geoStatus: "FAILED" },
    });
  } catch (error) {
    console.error("[auth] 로그인 기록 저장 실패", error);
  }
}

/** 보관 기간이 지난 로그인 기록을 지운다. 지운 개수를 돌려준다. */
export async function purgeOldLoginAttempts(now = new Date()): Promise<number> {
  const before = new Date(now.getTime() - LOGIN_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await db.loginAttempt.deleteMany({ where: { createdAt: { lt: before } } });
  return count;
}
