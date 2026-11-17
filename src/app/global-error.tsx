"use client";

/**
 * 최상위 레이아웃 자체가 실패했을 때 보이는 화면.
 * 레이아웃과 전역 스타일을 쓸 수 없으므로 필요한 스타일을 직접 적는다.
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          fontFamily: "system-ui, 'Malgun Gothic', sans-serif",
          lineHeight: 1.7,
          colorScheme: "light dark",
        }}
      >
        <title>페이지를 표시하지 못했습니다</title>
        <div role="alert" style={{ maxWidth: 480 }}>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.3 }}>페이지를 표시하지 못했습니다</h1>
          <p>일시적인 문제일 수 있습니다. 잠시 뒤 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ minHeight: 44, padding: "0 18px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
