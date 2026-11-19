/** 로그인 기록: 외부에 묻지 않고 판단하는 부분(테스트하기 쉽게 DB·네트워크와 나눈다). */
import { isIP } from "node:net";

/** 위치를 조회할 수 없는 주소: 형식이 틀렸거나, 사설·내부·예약 대역 */
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 0) return true;

  if (version === 6) {
    const lower = ip.toLowerCase();
    // IPv4 를 IPv6 형식으로 쓴 주소(::ffff:10.0.0.1)는 IPv4 규칙으로 본다.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return isPrivateIp(mapped[1]!);
    return (
      lower === "::" ||
      lower === "::1" ||
      /^f[cd][0-9a-f]{2}:/.test(lower) || // fc00::/7 고유 로컬
      /^fe[89ab][0-9a-f]:/.test(lower) // fe80::/10 링크 로컬
    );
  }

  const [a = 0, b = 0] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // 통신사 내부(CGNAT)
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // 멀티캐스트·예약
  );
}

export type GeoInfo = { country: string; region: string; city: string; isp: string };

/** ip-api.com 응답에서 필요한 값만 꺼낸다. 실패 응답이나 형식이 틀리면 null. */
export function parseIpApiResponse(body: unknown): GeoInfo | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  if (value.status !== "success") return null;
  const text = (key: string) => (typeof value[key] === "string" ? (value[key] as string).slice(0, 100) : "");
  const info = { country: text("country"), region: text("regionName"), city: text("city"), isp: text("isp") };
  return info.country ? info : null;
}

/** "서울, Seoul · 대한민국" 처럼 겹치는 이름을 빼고 작은 단위부터 이어 붙인다. */
export function formatLocation(info: { country: string; region: string; city: string }): string {
  const parts: string[] = [];
  for (const part of [info.city, info.region, info.country]) {
    if (part && !parts.includes(part)) parts.push(part);
  }
  return parts.join(", ");
}

/** User-Agent 를 "Chrome · Windows" 정도로 줄인다. 모르면 "알 수 없음". */
export function describeUserAgent(userAgent: string): string {
  const ua = userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser\//.test(ua)
      ? "삼성 인터넷"
      : /Whale\//.test(ua)
        ? "Whale"
        : /OPR\//.test(ua)
          ? "Opera"
          : /Firefox\/|FxiOS\//.test(ua)
            ? "Firefox"
            : /Chrome\/|CriOS\//.test(ua)
              ? "Chrome"
              : /Safari\//.test(ua) && /Version\//.test(ua)
                ? "Safari"
                : "";
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  if (!browser && !os) return ua ? "알 수 없음" : "정보 없음";
  return [browser || "기타 브라우저", os].filter(Boolean).join(" · ");
}
