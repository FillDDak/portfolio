/** User-Agent 와 유입 정보를 분류하는 순수 함수 모음 */

const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|fetch|monitor|scan|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|curl|wget|python-requests|python-urllib|httpclient|okhttp|go-http-client|java\/|axios|node-fetch|undici|postman|insomnia|facebookexternalhit|whatsapp|kakaotalk-scrap|yeti|daumoa|embedly|quora link|vkshare|w3c_validator|phantomjs|selenium|puppeteer|playwright/i;

/** 봇이나 자동화 도구로 보이는 요청인지. User-Agent 가 없어도 봇으로 본다. */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim().length < 10) return true;
  return BOT_PATTERN.test(userAgent);
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
  | { kind: "project"; path: string; slug: string }
  | { kind: "post"; path: string; slug: string };

/** 집계할 공개 페이지인지 확인하고 경로를 정리한다. 관리자 화면이나 알 수 없는 경로는 null. */
export function parseTrackedPath(path: unknown): TrackedPage | null {
  if (typeof path !== "string" || path.length > 200) return null;
  const clean = path.split(/[?#]/)[0] ?? "";
  if (clean === "/" || clean === "/resume" || clean === "/status" || clean === "/blog") {
    return { kind: "page", path: clean };
  }
  const project = clean.match(/^\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (project?.[1]) return { kind: "project", path: clean, slug: project[1] };
  const post = clean.match(/^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (post?.[1]) return { kind: "post", path: clean, slug: post[1] };
  return null;
}

/* ── 콘텐츠 반응 이벤트 ─────────────────────────────────────── */

/** 홈에서 도달 여부를 세는 섹션. 화면 순서와 같다. */
export const TRACKED_SECTIONS = ["projects", "experience", "skills", "certificates", "contact"] as const;
export type TrackedSection = (typeof TRACKED_SECTIONS)[number];

export const PROFILE_LINK_KEYS = ["github", "blog", "notion"] as const;
export const PROJECT_LINK_KEYS = ["demo", "github", "docs"] as const;

export type ContentEvent = {
  event: "home" | "section" | "card" | "link" | "contact";
  target: string;
  /** 프로젝트에 딸린 이벤트일 때, 기록 전에 공개 중인 프로젝트인지 확인할 id */
  projectId?: number;
};

const PROJECT_ID = /^[1-9]\d{0,8}$/;

/**
 * 브라우저가 보낸 이벤트를 검사한다. 정해 둔 형식이 아니면 null.
 *   home                          홈 방문(탭 세션당 1번)
 *   section  projects|experience|skills|certificates|contact
 *   card     <프로젝트 id>         홈의 프로젝트 카드 클릭
 *   link     profile:<github|blog|notion> | project:<id>:<demo|github|docs>
 *   contact  start                문의 폼 작성 시작
 * PDF 열람과 문의 전송은 서버에서 직접 기록하므로 여기서는 받지 않는다.
 */
export function parseContentEvent(event: unknown, target: unknown): ContentEvent | null {
  if (typeof event !== "string" || typeof target !== "string" || target.length > 60) return null;

  switch (event) {
    case "home":
      return target === "" ? { event, target } : null;
    case "section":
      return (TRACKED_SECTIONS as readonly string[]).includes(target) ? { event, target } : null;
    case "card":
      return PROJECT_ID.test(target) ? { event, target, projectId: Number(target) } : null;
    case "link": {
      const [scope, a, b, ...rest] = target.split(":");
      if (rest.length > 0) return null;
      if (scope === "profile" && b === undefined && (PROFILE_LINK_KEYS as readonly string[]).includes(a ?? "")) {
        return { event, target };
      }
      if (scope === "project" && PROJECT_ID.test(a ?? "") && (PROJECT_LINK_KEYS as readonly string[]).includes(b ?? "")) {
        return { event, target, projectId: Number(a) };
      }
      return null;
    }
    case "contact":
      return target === "start" ? { event, target } : null;
    default:
      return null;
  }
}

/** 같은 방문자가 같은 페이지를 다시 봤을 때 조회수를 올릴지: 마지막 기록에서 30분이 지나야 올린다. */
export const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

export function shouldCountView(lastViewAt: Date | number | null, now: Date | number): boolean {
  if (lastViewAt === null) return true;
  const last = typeof lastViewAt === "number" ? lastViewAt : lastViewAt.getTime();
  const current = typeof now === "number" ? now : now.getTime();
  return current - last >= DEDUPE_WINDOW_MS;
}
