"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// 새 문의가 1~2초 안에 보이도록 짧게 둔다. 개수만 세는 가벼운 요청이라 서버 부담은 거의 없다.
const REFRESH_INTERVAL_MS = 2_000;

/**
 * 받은 문의 상태를 2초마다 확인하고, 화면에 그려진 값(signature)과 다르면 화면을 다시 그린다.
 * 메뉴의 읽지 않은 문의 배지, 대시보드 숫자, 받은 문의 목록이 새로고침 없이 바뀐다.
 * 화면에는 아무것도 그리지 않는다.
 */
export function MessageWatcher({ signature }: { signature: string }) {
  const router = useRouter();
  const rendered = useRef(signature);
  const requested = useRef<string | null>(null);

  useEffect(() => {
    rendered.current = signature;
    requested.current = null;
  }, [signature]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/admin/messages/summary", { cache: "no-store" });
        if (!response.ok) return;
        const result = (await response.json()) as { ok: boolean; signature?: string };
        if (cancelled || !result.ok || typeof result.signature !== "string") return;
        // 같은 변화로 여러 번 다시 그리지 않게, 요청한 값은 기억해 둔다.
        if (result.signature !== rendered.current && result.signature !== requested.current) {
          requested.current = result.signature;
          router.refresh();
        }
      } catch {
        // 네트워크가 잠깐 끊겨도 다음 확인 때 다시 시도한다.
      }
    };
    const timer = window.setInterval(check, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [router]);

  return null;
}
