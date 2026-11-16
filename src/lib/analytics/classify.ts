/** User-Agent 와 유입 정보를 분류하는 순수 함수 모음 */

const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|fetch|monitor|scan|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|curl|wget|python-requests|python-urllib|httpclient|okhttp|go-http-client|java\/|axios|node-fetch|undici|postman|insomnia|facebookexternalhit|whatsapp|kakaotalk-scrap|yeti|daumoa|embedly|quora link|vkshare|w3c_validator|phantomjs|selenium|puppeteer|playwright/i;

/** 봇이나 자동화 도구로 보이는 요청인지. User-Agent 가 없어도 봇으로 본다. */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim().length < 10) return true;
  return BOT_PATTERN.test(userAgent);
}

export type DeviceType = "desktop" | "mobile" | "tablet";

export function deviceType(userAgent: string): DeviceType {
  if (/ipad|tablet|playbook|silk|kindle|sm-t\d|nexus (7|9|10)/i.test(userAgent)) return "tablet";
  // 안드로이드는 "Mobile" 이 없으면 태블릿이다.
  if (/android/i.test(userAgent) && !/mobile/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|ipod|android|windows phone|blackberry|opera mini/i.test(userAgent)) return "mobile";
  return "desktop";
}

/**
 * 유입 사이트의 도메인만 남긴다. 주소의 경로와 검색어에는 개인 정보가 들어 있을 수 있어 저장하지 않는다.
 * 내 사이트 안에서 이동한 경우와 값이 없는 경우는 빈 문자열(직접 접속).
 */
export function referrerDomain(referrer: string | null | undefined, siteHost: string): string {
  if (!referrer) return "";
  try {
    const url = new URL(referrer);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const own = siteHost.toLowerCase().replace(/^www\./, "");
    if (!host || host === own) return "";
    return host.slice(0, 100);
  } catch {
    return "";
  }
}

/** utm_source 는 짧은 영문·숫자 꼬리표만 받는다. */
export function cleanUtmSource(value: string | null | undefined): string {
  if (!value) return "";
  const cleaned = value.trim().toLowerCase();
  return /^[a-z0-9._-]{1,50}$/.test(cleaned) ? cleaned : "";
}

export type TrackedPage =
  | { kind: "page"; path: string }
  | { kind: "project"; path: string; slug: string };

/** 집계할 공개 페이지인지 확인하고 경로를 정리한다. 관리자 화면이나 알 수 없는 경로는 null. */
export function parseTrackedPath(path: unknown): TrackedPage | null {
  if (typeof path !== "string" || path.length > 200) return null;
  const clean = path.split(/[?#]/)[0] ?? "";
  if (clean === "/" || clean === "/resume" || clean === "/status") {
    return { kind: "page", path: clean };
  }
  const project = clean.match(/^\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (project?.[1]) return { kind: "project", path: clean, slug: project[1] };
  return null;
}

/** 같은 방문자가 같은 페이지를 다시 봤을 때 조회수를 올릴지: 마지막 기록에서 30분이 지나야 올린다. */
export const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

export function shouldCountView(lastViewAt: Date | number | null, now: Date | number): boolean {
  if (lastViewAt === null) return true;
  const last = typeof lastViewAt === "number" ? lastViewAt : lastViewAt.getTime();
  const current = typeof now === "number" ? now : now.getTime();
  return current - last >= DEDUPE_WINDOW_MS;
}
