/**
 * 프록시 뒤에서 방문자 IP 를 읽는다.
 *
 * X-Forwarded-For 는 "방문자가 보낸 값, …, 프록시가 덧붙인 값" 순서라 앞쪽은 방문자가 마음대로 쓸 수 있다.
 * 그래서 신뢰할 수 있는 프록시 수(trustedHops)만큼 뒤에서 세어, 우리 프록시가 직접 본 주소만 사용한다.
 *
 * - trustedHops = 1 (Nginx 하나): 마지막 값
 * - trustedHops = 2 (Cloudflare + Nginx): 뒤에서 두 번째 값
 * - trustedHops = 0 (프록시 없음): 헤더를 믿지 않는다
 *
 * IP 를 알 수 없으면 "unknown" 을 돌려준다. 이 값은 요청 제한과 방문자 해시에만 쓰고 저장하지 않는다.
 */
export function getClientIp(headers: Headers, trustedHops: number): string {
  if (trustedHops <= 0) return "unknown";

  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";

  const parts = forwarded
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const candidate = parts[parts.length - trustedHops];
  if (!candidate) return "unknown";

  return normalizeIp(candidate);
}

function normalizeIp(value: string): string {
  // "[::1]:1234" 또는 "1.2.3.4:1234" 형태의 포트를 떼어낸다.
  const bracketed = value.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed?.[1]) return bracketed[1].toLowerCase();
  const v4WithPort = value.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (v4WithPort?.[1]) return v4WithPort[1];
  // IP 에 쓰일 수 없는 문자가 섞여 있으면 믿지 않는다.
  if (!/^[0-9a-fA-F:.]+$/.test(value)) return "unknown";
  return value.toLowerCase();
}
