"use client";

import { MoonIcon, SunIcon } from "@/components/icons";

/**
 * 밝은/어두운 화면 전환. 기본은 시스템 설정을 따르고, 누르면 선택을 localStorage 에 저장한다.
 * 아이콘 표시는 CSS(.theme-icon-*)로 처리해서 서버 렌더링 결과와 어긋나지 않는다.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current =
      root.dataset.theme ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // 저장소를 쓸 수 없는 환경에서는 이번 방문에만 적용한다.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="밝은 화면과 어두운 화면 전환"
      className="inline-flex size-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      <MoonIcon className="theme-icon-light" />
      <SunIcon className="theme-icon-dark" />
    </button>
  );
}
