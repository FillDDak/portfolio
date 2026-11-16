"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * 브라우저 내장 PDF 뷰어.
 * 모바일 브라우저 상당수는 PDF 를 페이지 안에 표시하지 못하므로(navigator.pdfViewerEnabled === false),
 * 그런 경우 빈 상자 대신 "새 탭에서 열기 / 다운로드" 안내를 보여준다.
 */
export function PdfViewer({ src }: { src: string }) {
  // 서버 렌더링과 첫 화면에서는 "지원함"으로 두고, 브라우저에서 실제 값을 읽는다.
  const supported = useSyncExternalStore(
    subscribe,
    () => navigator.pdfViewerEnabled !== false,
    () => true,
  );

  const fallback = (
    <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="font-semibold">이 브라우저에서는 PDF 를 바로 표시할 수 없습니다.</p>
      <p className="text-muted">위의 “새 탭에서 열기” 또는 “다운로드” 버튼을 이용해 주세요.</p>
    </div>
  );

  if (!supported) {
    return (
      <div data-testid="pdf-fallback" className="mt-6 rounded-xl border border-line bg-surface">
        {fallback}
      </div>
    );
  }

  return (
    <object
      data={src}
      type="application/pdf"
      aria-label="PDF 포트폴리오 미리보기"
      className="mt-6 h-[75dvh] min-h-96 w-full rounded-xl border border-line bg-surface"
    >
      {fallback}
    </object>
  );
}
