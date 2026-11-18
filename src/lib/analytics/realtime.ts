/** 공개 페이지가 하트비트를 보내는 간격 */
export const HEARTBEAT_INTERVAL_MS = 15_000;
/**
 * 이 시간 안에 신호가 있었던 세션을 "접속 중"으로 센다.
 * 보통은 탭을 닫거나 다른 탭으로 갈 때 오는 "나감" 신호로 바로 빠지고,
 * 그 신호가 오지 못한 경우(브라우저 강제 종료, 네트워크 끊김)에만 이 시간이 지나 빠진다.
 * 신호를 한 번 놓쳐도(30초 간격) 접속 중으로 남도록 간격의 두 배보다 조금 길게 둔다.
 */
export const ACTIVE_WINDOW_MS = 35_000;

export type RealtimeTracker = {
  /** 세션의 신호를 기록한다 */
  beat(sessionId: string): void;
  /** 세션이 나갔다(탭 닫힘, 다른 탭으로 전환). 바로 집계에서 뺀다 */
  leave(sessionId: string): void;
  /** 최근 35초 안에 신호가 있는 세션 수 */
  count(): number;
};

/**
 * 실시간 접속자 집계. 프로세스 메모리의 Map 에 "세션 → 마지막 신호 시각"만 둔다.
 * 서버가 한 프로세스라 Redis 없이 충분하고, 재시작하면 다음 신호(15초 안)에 다시 채워진다.
 */
export function createRealtimeTracker(options?: {
  now?: () => number;
  maxSessions?: number;
}): RealtimeTracker {
  const now = options?.now ?? Date.now;
  // 누군가 임의의 세션 값을 대량으로 보내도 메모리가 계속 늘지 않게 상한을 둔다.
  const maxSessions = options?.maxSessions ?? 5000;
  const lastSeen = new Map<string, number>();

  function prune(current: number) {
    for (const [id, time] of lastSeen) {
      if (current - time > ACTIVE_WINDOW_MS) lastSeen.delete(id);
    }
  }

  return {
    beat(sessionId) {
      const current = now();
      if (!lastSeen.has(sessionId) && lastSeen.size >= maxSessions) {
        prune(current);
        if (lastSeen.size >= maxSessions) return;
      }
      lastSeen.set(sessionId, current);
    },
    leave(sessionId) {
      lastSeen.delete(sessionId);
    },
    count() {
      const current = now();
      prune(current);
      return lastSeen.size;
    },
  };
}

export function getRealtimeTracker(): RealtimeTracker {
  const store = globalThis as unknown as { __realtime?: RealtimeTracker };
  store.__realtime ??= createRealtimeTracker();
  return store.__realtime;
}
