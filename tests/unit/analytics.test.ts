import { describe, expect, it } from "vitest";
import {
  cleanUtmSource,
  DEDUPE_WINDOW_MS,
  isBot,
  parseContentEvent,
  parseTrackedPath,
  referrerDomain,
  shouldCountView,
} from "@/lib/analytics/classify";
import { describeDevice } from "@/lib/device/describe";
import {
  ACTIVE_WINDOW_MS,
  createRealtimeTracker,
  HEARTBEAT_INTERVAL_MS,
} from "@/lib/analytics/realtime";
import { addDays, kstDate, kstDayStart, visitorHash } from "@/lib/analytics/visitor";

const chrome =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const MINUTE = 60_000;

describe("조회수 중복 제거 (같은 방문자·같은 페이지 30분)", () => {
  const first = Date.parse("2026-11-17T03:00:00Z");

  it("처음 본 페이지는 센다", () => {
    expect(shouldCountView(null, first)).toBe(true);
  });

  it("30분 안에 다시 보면 세지 않는다", () => {
    expect(shouldCountView(first, first + 1000)).toBe(false);
    expect(shouldCountView(first, first + 29 * MINUTE + 59_000)).toBe(false);
  });

  it("30분이 지나면 다시 센다", () => {
    expect(shouldCountView(first, first + DEDUPE_WINDOW_MS)).toBe(true);
    expect(shouldCountView(new Date(first), new Date(first + 31 * MINUTE))).toBe(true);
  });
});

describe("실시간 접속자 계산 (최근 60초 안에 신호가 있는 세션 수)", () => {
  function setup(maxSessions?: number) {
    let time = 1_000_000;
    const tracker = createRealtimeTracker({ now: () => time, maxSessions });
    return {
      tracker,
      advance(ms: number) {
        time += ms;
      },
    };
  }

  it("신호를 보낸 세션 수를 센다", () => {
    const { tracker } = setup();
    expect(tracker.count()).toBe(0);
    tracker.beat("session-a");
    tracker.beat("session-b");
    expect(tracker.count()).toBe(2);
  });

  it("같은 세션이 여러 번 보내도 한 명으로 센다", () => {
    const { tracker, advance } = setup();
    tracker.beat("session-a");
    advance(HEARTBEAT_INTERVAL_MS);
    tracker.beat("session-a");
    expect(tracker.count()).toBe(1);
  });

  it("35초 동안 신호가 없으면 빠진다(나감 신호가 오지 못한 경우)", () => {
    const { tracker, advance } = setup();
    tracker.beat("session-a");
    advance(ACTIVE_WINDOW_MS);
    expect(tracker.count()).toBe(1);
    advance(1);
    expect(tracker.count()).toBe(0);
  });

  it("15초마다 신호를 보내는 세션은 한 번 놓쳐도 계속 접속 중으로 본다", () => {
    const { tracker, advance } = setup();
    tracker.beat("session-a");
    advance(HEARTBEAT_INTERVAL_MS * 2);
    expect(tracker.count()).toBe(1);
  });

  it("나감 신호를 보낸 세션은 바로 빠지고, 돌아오면 바로 다시 센다", () => {
    const { tracker } = setup();
    tracker.beat("session-a");
    tracker.beat("session-b");
    tracker.leave("session-a");
    expect(tracker.count()).toBe(1);
    tracker.beat("session-a");
    expect(tracker.count()).toBe(2);
  });

  it("모르는 세션의 나감 신호는 무시한다", () => {
    const { tracker } = setup();
    tracker.beat("session-a");
    tracker.leave("unknown");
    expect(tracker.count()).toBe(1);
  });

  it("떠난 세션과 남은 세션을 구분한다", () => {
    const { tracker, advance } = setup();
    tracker.beat("leaving");
    tracker.beat("staying");
    advance(40_000);
    tracker.beat("staying");
    advance(30_000);
    expect(tracker.count()).toBe(1);
  });

  it("세션 수에 상한이 있어 메모리가 계속 늘지 않는다", () => {
    const { tracker, advance } = setup(3);
    for (const id of ["a", "b", "c", "d", "e"]) tracker.beat(id);
    expect(tracker.count()).toBe(3);
    advance(ACTIVE_WINDOW_MS + 1);
    tracker.beat("f");
    expect(tracker.count()).toBe(1);
  });
});

describe("방문자 해시", () => {
  const base = { ip: "203.0.113.7", userAgent: chrome, secret: "s".repeat(40), date: "2026-11-17" };

  it("같은 날 같은 IP 와 브라우저는 같은 값이다", () => {
    expect(visitorHash(base)).toBe(visitorHash({ ...base }));
  });

  it("IP 나 브라우저가 다르면 다른 값이다", () => {
    expect(visitorHash({ ...base, ip: "203.0.113.8" })).not.toBe(visitorHash(base));
    expect(visitorHash({ ...base, userAgent: iphone })).not.toBe(visitorHash(base));
  });

  it("날짜가 바뀌면 다른 값이 되어 여러 날에 걸쳐 추적할 수 없다", () => {
    expect(visitorHash({ ...base, date: "2026-11-18" })).not.toBe(visitorHash(base));
  });

  it("비밀값이 다르면 다른 값이고, 결과에 IP 원문이 들어 있지 않다", () => {
    expect(visitorHash({ ...base, secret: "x".repeat(40) })).not.toBe(visitorHash(base));
    expect(visitorHash(base)).toMatch(/^[a-f0-9]{32}$/);
    expect(visitorHash(base)).not.toContain("203");
  });
});

describe("한국 시간 날짜 계산", () => {
  it("UTC 15시부터 한국은 다음 날이다", () => {
    expect(kstDate(Date.parse("2026-11-16T14:59:59Z"))).toBe("2026-11-16");
    expect(kstDate(Date.parse("2026-11-16T15:00:00Z"))).toBe("2026-11-17");
  });

  it("한국 날짜의 0시를 UTC 로 바꾼다", () => {
    expect(kstDayStart("2026-11-17").toISOString()).toBe("2026-11-16T15:00:00.000Z");
  });

  it("날짜를 더하고 뺀다", () => {
    expect(addDays("2026-11-17", -6)).toBe("2026-11-11");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("봇 판별", () => {
  it("일반 브라우저는 봇이 아니다", () => {
    expect(isBot(chrome)).toBe(false);
    expect(isBot(iphone)).toBe(false);
  });

  it("검색 엔진, 미리보기, 자동화 도구는 봇이다", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36",
      "curl/8.5.0",
      "python-requests/2.32.0",
      "Mozilla/5.0 (Linux; Android 11; moto g power) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 Chrome-Lighthouse",
    ]) {
      expect(isBot(ua), ua).toBe(true);
    }
  });

  it("User-Agent 가 없으면 봇으로 본다", () => {
    expect(isBot("")).toBe(true);
    expect(isBot(null)).toBe(true);
  });
});

const deviceType = (ua: string) => describeDevice(ua).kind;

describe("기기 종류", () => {
  it("PC, 모바일, 태블릿을 구분한다", () => {
    expect(deviceType(chrome)).toBe("desktop");
    expect(deviceType(iphone)).toBe("mobile");
    expect(deviceType("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148")).toBe("tablet");
    expect(deviceType("Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/140 Safari/537.36")).toBe("tablet");
    expect(deviceType("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36")).toBe("mobile");
  });
});

describe("유입 경로", () => {
  it("도메인만 남기고 경로와 검색어는 버린다", () => {
    expect(referrerDomain("https://www.google.com/search?q=최현규+포트폴리오", "fillddak.kr")).toBe("google.com");
    expect(referrerDomain("https://velog.io/@cgr456/posts", "fillddak.kr")).toBe("velog.io");
  });

  it("내 사이트 안에서 이동했거나 값이 없으면 직접 접속(빈 값)이다", () => {
    expect(referrerDomain("https://fillddak.kr/projects/a", "fillddak.kr")).toBe("");
    expect(referrerDomain("https://www.fillddak.kr/", "fillddak.kr")).toBe("");
    expect(referrerDomain("", "fillddak.kr")).toBe("");
    expect(referrerDomain(null, "fillddak.kr")).toBe("");
  });

  it("주소가 아니거나 http(s) 가 아니면 버린다", () => {
    expect(referrerDomain("not a url", "fillddak.kr")).toBe("");
    expect(referrerDomain("android-app://com.example", "fillddak.kr")).toBe("");
  });

  it("utm_source 는 짧은 영문·숫자 꼬리표만 받는다", () => {
    expect(cleanUtmSource("LinkedIn")).toBe("linkedin");
    expect(cleanUtmSource("resume_pdf-2026")).toBe("resume_pdf-2026");
    expect(cleanUtmSource("<script>")).toBe("");
    expect(cleanUtmSource("a".repeat(51))).toBe("");
    expect(cleanUtmSource(null)).toBe("");
  });
});

describe("집계 대상 경로", () => {
  it("공개 페이지만 받는다", () => {
    expect(parseTrackedPath("/")).toEqual({ kind: "page", path: "/" });
    expect(parseTrackedPath("/resume")).toEqual({ kind: "page", path: "/resume" });
    expect(parseTrackedPath("/projects/coupon-system?utm_source=x#top")).toEqual({
      kind: "project",
      path: "/projects/coupon-system",
      slug: "coupon-system",
    });
  });

  it("관리자 화면과 알 수 없는 경로는 무시한다", () => {
    for (const path of ["/admin", "/admin/projects", "/api/track", "/projects/", "/projects/A_B", "/x", "", 123, null]) {
      expect(parseTrackedPath(path), String(path)).toBeNull();
    }
  });
});

describe("parseContentEvent (콘텐츠 반응 이벤트 검사)", () => {
  it("정해 둔 형식만 받는다", () => {
    expect(parseContentEvent("home", "")).toEqual({ event: "home", target: "" });
    expect(parseContentEvent("section", "projects")).toEqual({ event: "section", target: "projects" });
    expect(parseContentEvent("section", "contact")).toEqual({ event: "section", target: "contact" });
    expect(parseContentEvent("section", "experience")).toEqual({ event: "section", target: "experience" });
    expect(parseContentEvent("card", "12")).toEqual({ event: "card", target: "12", projectId: 12 });
    expect(parseContentEvent("link", "profile:github")).toEqual({ event: "link", target: "profile:github" });
    expect(parseContentEvent("link", "project:3:docs")).toEqual({
      event: "link",
      target: "project:3:docs",
      projectId: 3,
    });
    expect(parseContentEvent("contact", "start")).toEqual({ event: "contact", target: "start" });
  });

  it("모르는 이벤트, 이상한 대상, 서버에서만 기록하는 이벤트는 버린다", () => {
    const rejected: [unknown, unknown][] = [
      ["home", "x"],
      ["section", "hero"],
      ["section", ""],
      ["card", "0"],
      ["card", "-1"],
      ["card", "1.5"],
      ["card", "abc"],
      ["link", "profile:twitter"],
      ["link", "profile:github:extra"],
      ["link", "project:abc:github"],
      ["link", "project:3:homepage"],
      ["link", "https://evil.example"],
      ["contact", "sent"], // 문의 전송은 서버가 직접 센다
      ["pdf", "view"], // PDF 열람도 서버가 직접 센다
      ["unknown", ""],
      [123, ""],
      ["section", null],
      ["section", "x".repeat(61)],
    ];
    for (const [event, target] of rejected) {
      expect(parseContentEvent(event, target), `${String(event)} / ${String(target)}`).toBeNull();
    }
  });
});