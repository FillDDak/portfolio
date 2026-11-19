"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { collectClientInfo } from "@/lib/device/collect";
import { sendTrack, sendTrackBeacon, splitTrackAttribute, trackEventOnce } from "@/lib/analytics/client";

// src/lib/analytics/realtime.ts 의 HEARTBEAT_INTERVAL_MS 와 같은 값
const HEARTBEAT_INTERVAL_MS = 15_000;

// src/lib/analytics/classify.ts 의 TRACKED_SECTIONS 와 같은 값(클라이언트 번들에 서버 코드를 넣지 않으려고 따로 둔다)
const TRACKED_SECTIONS = ["projects", "skills", "certificates", "contact"];

function getSessionId(): string {
  try {
    const saved = sessionStorage.getItem("sid");
    if (saved) return saved;
    const created = crypto.randomUUID();
    sessionStorage.setItem("sid", created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * 공개 페이지의 방문 기록, 실시간 접속 신호, 콘텐츠 반응 집계.
 * 화면에는 아무것도 그리지 않는다. 쿠키를 쓰지 않고, 탭을 닫으면 사라지는 sessionStorage 만 쓴다.
 *
 * 콘텐츠 반응(모두 탭 세션당 1번씩, 날짜별 횟수로만 저장):
 * - 홈 방문과 홈의 각 섹션이 화면에 처음 보였는지
 * - data-track 속성을 붙인 링크(프로젝트 카드, 외부 링크) 클릭
 * - data-track-input="contact" 를 붙인 폼에 처음 입력했는지
 */
export function Analytics() {
  const pathname = usePathname();

  // 페이지를 볼 때마다 조회 1건
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = { type: "view", path: pathname, referrer: document.referrer, utmSource: params.get("utm_source") ?? "" };
    void collectClientInfo().then((client) => sendTrack({ ...view, client }));
  }, [pathname]);

  // 홈 방문과 섹션 도달
  useEffect(() => {
    if (pathname !== "/") return;
    trackEventOnce("home");

    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          trackEventOnce("section", entry.target.id);
          observer.unobserve(entry.target);
        }
      },
      // 섹션의 윗부분이 화면 아래쪽 20% 선을 넘어 들어오면 '도달'로 본다.
      { rootMargin: "0px 0px -20% 0px" },
    );
    for (const id of TRACKED_SECTIONS) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [pathname]);

  // 링크 클릭과 문의 폼 작성 시작(문서 전체에서 한 번에 받는다)
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // 왼쪽 클릭과 가운데 클릭(새 탭에서 열기)만 센다.
      if (event.button !== 0 && event.button !== 1) return;
      const element = (event.target as Element | null)?.closest?.("[data-track]");
      const parsed = splitTrackAttribute(element?.getAttribute("data-track") ?? "");
      if (parsed) trackEventOnce(parsed.event, parsed.target);
    };
    const onInput = (event: Event) => {
      if ((event.target as Element | null)?.closest?.('[data-track-input="contact"]')) {
        trackEventOnce("contact", "start");
      }
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    document.addEventListener("input", onInput, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
      document.removeEventListener("input", onInput, true);
    };
  }, []);

  // 실시간 접속 신호
  // - 탭이 보이는 동안 15초마다 "접속 중" 신호를 보낸다.
  // - 탭을 닫거나 다른 탭·앱으로 가면 바로 "나감" 신호를 보내고, 돌아오면 바로 다시 "접속 중"을 보낸다.
  // - "나감" 이 전달되지 못해도(강제 종료 등) 서버가 35초 뒤에 스스로 뺀다.
  useEffect(() => {
    const sessionId = getSessionId();
    const beat = () => {
      if (document.visibilityState === "visible") sendTrack({ type: "beat", sessionId });
    };
    const leave = () => sendTrackBeacon({ type: "leave", sessionId });
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") beat();
      else leave();
    };
    // 뒤로 가기 캐시(bfcache)에서 페이지가 되살아나면 다시 접속 중으로 센다.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) beat();
    };

    beat();
    const timer = window.setInterval(beat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
