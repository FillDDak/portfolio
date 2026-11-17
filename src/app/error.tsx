"use client";

import { useEffect } from "react";
import { buttonClass } from "@/components/ui/button";

/** 페이지를 그리다가 예상하지 못한 오류가 났을 때 보이는 화면 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center px-5 py-20 md:px-8"
    >
      <div role="alert">
        <p className="font-mono text-sm font-medium text-danger">오류</p>
        <h1 className="mt-1 text-[1.875rem] leading-tight font-bold tracking-tight">
          페이지를 표시하지 못했습니다
        </h1>
        <p className="mt-3 text-muted">
          일시적인 문제일 수 있습니다. 잠시 뒤 다시 시도해 주세요.
        </p>
      </div>
      <div className="mt-7 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => retry()}
          className={buttonClass("primary")}
        >
          다시 시도
        </button>
        {/* 오류 상태를 완전히 벗어나도록 새로 불러온다. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className={buttonClass("secondary")}>
          홈으로 가기
        </a>
      </div>
    </main>
  );
}
