"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// src/lib/analytics/realtime.ts 의 HEARTBEAT_INTERVAL_MS 와 같은 값
const HEARTBEAT_INTERVAL_MS = 25_000;

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  try {
    // 페이지를 떠나는 중에도 전송이 끊기지 않게 keepalive 를 쓴다.
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 통계 전송 실패는 무시한다.
  }
}

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
 * 공개 페이지의 방문 기록과 실시간 접속 신호.
 * 화면에는 아무것도 그리지 않는다. 쿠키를 쓰지 않고, 탭을 닫으면 사라지는 임의의 세션 값만 쓴다.
 */
export function Analytics() {
  const pathname = usePathname();

  // 페이지를 볼 때마다 조회 1건
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    send({
      type: "view",
      path: pathname,
      referrer: document.referrer,
      utmSource: params.get("utm_source") ?? "",
    });
  }, [pathname]);

  // 25초마다 접속 신호. 탭이 보이지 않는 동안에는 보내지 않는다.
  useEffect(() => {
    const sessionId = getSessionId();
    const beat = () => {
      if (document.visibilityState === "visible") send({ type: "beat", sessionId });
    };
    beat();
    const timer = window.setInterval(beat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);

  return null;
}
