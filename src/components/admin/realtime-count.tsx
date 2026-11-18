"use client";

import { useEffect, useState } from "react";

// 방문자가 들어오고 나가는 것이 1~2초 안에 보이도록 짧게 둔다. 관리자 한 명만 보는 화면이라 서버 부담은 거의 없다.
const REFRESH_INTERVAL_MS = 2_000;

type State = { status: "loading" } | { status: "ok"; count: number } | { status: "error" };

/** 실시간 접속자 수. 화면이 보이는 동안 2초마다 다시 불러온다. */
export function RealtimeCount() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/admin/realtime", { cache: "no-store" });
        const result = (await response.json()) as { ok: boolean; count?: number };
        if (cancelled) return;
        setState(
          result.ok && typeof result.count === "number"
            ? { status: "ok", count: result.count }
            : { status: "error" },
        );
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    };
    void load();
    const timer = window.setInterval(load, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  return (
    <div className="rounded-xl border border-line bg-surface p-4 md:p-5">
      <p className="text-[0.9375rem] font-medium text-muted">실시간 접속자</p>
      <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums" aria-live="polite">
        {state.status === "ok" ? (
          <>
            {state.count.toLocaleString("ko-KR")}
            <span className="ml-1 text-lg font-semibold text-muted">명</span>
          </>
        ) : state.status === "loading" ? (
          <span className="text-muted">…</span>
        ) : (
          <span className="text-lg font-semibold text-danger">불러오지 못했습니다</span>
        )}
      </p>
      <p className="mt-1 text-sm text-muted">지금 공개 페이지를 보고 있는 탭 · 2초마다 갱신</p>
    </div>
  );
}
