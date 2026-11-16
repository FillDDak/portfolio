"use client";

import { useEffect } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";

type Theme = "light" | "dark";

const systemTheme = (): Theme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

/** 수동 선택을 지우고 기기 설정을 따르는 상태로 돌아간다. */
function followSystem() {
  delete document.documentElement.dataset.theme;
  try {
    localStorage.removeItem("theme");
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 저장된 값도 없다.
  }
}

/**
 * 밝은/어두운 화면 전환.
 *
 * 기본은 기기의 주간/야간 설정을 따른다(CSS 의 prefers-color-scheme).
 * 버튼을 누르면 기기 설정과 반대로 잠시 바꿀 수 있고, 다음 경우에는 다시 기기 설정을 따른다.
 *   - 버튼을 한 번 더 눌러 기기 설정과 같은 화면으로 돌아왔을 때
 *   - 기기의 주간/야간 설정이 바뀌었을 때 (예: 해가 지면 자동으로 야간 모드가 되는 기기)
 *
 * 아이콘 표시는 CSS(.theme-icon-*)로 처리해서 서버 렌더링 결과와 어긋나지 않는다.
 */
export function ThemeToggle() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", followSystem);
    return () => media.removeEventListener("change", followSystem);
  }, []);

  function toggle() {
    const root = document.documentElement;
    const system = systemTheme();
    const current = (root.dataset.theme as Theme | undefined) ?? system;
    const next: Theme = current === "dark" ? "light" : "dark";

    if (next === system) {
      followSystem();
      return;
    }
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
