/** 로그인 기록: 외부에 묻지 않고 판단하는 부분(테스트하기 쉽게 DB·네트워크와 나눈다). */
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { describeDevice, parseClientInfo, type ClientInfo } from "@/lib/device/describe";

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

/** 저장된 기기 정보(JSON)를 읽는다. 깨졌으면 빈 객체. */
export function readClientInfo(json: string): ClientInfo {
  try {
    return parseClientInfo(JSON.parse(json));
  } catch {
    return {};
  }
}

/**
 * 같은 기기에서 온 기록을 묶어 보기 위한 짧은 값("A1B2-C3D4").
 * 브라우저·OS 업데이트로 바뀌지 않게 버전은 빼고, 화면·시간대·언어·하드웨어 값을 섞는다.
 * 브라우저에서 받은 값이 없으면(스크립트 없이 보낸 요청 등) 빈 문자열.
 */
export function deviceIdOf(userAgent: string, info: ClientInfo): string {
  if (!info.screen) return "";
  const device = describeDevice(userAgent, info);
  const withoutVersion = (value: string) => value.replace(/ [\d.]+$/, "");
  const parts = [
    withoutVersion(device.browser),
    withoutVersion(device.os),
    device.model,
    info.screen,
    info.dpr,
    info.tz,
    info.langs,
    info.cores,
    info.memory,
    info.touch,
  ];
  const hash = createHash("sha256").update(parts.map((part) => part ?? "").join("|")).digest("hex").toUpperCase();
  return `${hash.slice(0, 4)}-${hash.slice(4, 8)}`;
}
