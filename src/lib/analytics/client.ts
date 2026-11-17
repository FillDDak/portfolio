/**
 * 브라우저에서 /api/track 으로 통계 신호를 보내는 함수들.
 * 쿠키는 쓰지 않고, 탭을 닫으면 사라지는 sessionStorage 만 중복 확인에 쓴다.
 */

export function sendTrack(payload: Record<string, unknown>) {
  try {
    // 페이지를 떠나는 중(링크 클릭 직후 등)에도 전송이 끊기지 않게 keepalive 를 쓴다.
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 통계 전송 실패는 무시한다.
  }
}

/**
 * 콘텐츠 반응 이벤트를 탭 세션당 한 번만 보낸다.
 * 같은 사람이 새로고침하거나 같은 링크를 여러 번 눌러도 1로 센다.
 */
export function trackEventOnce(event: string, target = "") {
  const key = `ev:${event}:${target}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage 를 쓸 수 없으면(사생활 보호 모드 등) 중복 확인 없이 보낸다.
  }
  sendTrack({ type: "event", event, target });
}

/** data-track="link:profile:github" 처럼 붙인 값을 이벤트 이름과 대상으로 나눈다. */
export function splitTrackAttribute(value: string): { event: string; target: string } | null {
  const index = value.indexOf(":");
  if (index <= 0) return null;
  return { event: value.slice(0, index), target: value.slice(index + 1) };
}
