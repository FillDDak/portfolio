export type RateLimitResult = {
  allowed: boolean;
  /** 이번 요청을 포함해 남은 허용 횟수 */
  remaining: number;
  /** 막혔을 때 다시 시도할 수 있을 때까지 남은 초 */
  retryAfterSeconds: number;
};

export type RateLimiter = {
  /** 요청 1회를 기록하고 허용 여부를 돌려준다. */
  hit(key: string): RateLimitResult;
  /** 기록 없이 현재 상태만 확인한다. */
  peek(key: string): RateLimitResult;
  reset(key: string): void;
  size(): number;
};

/**
 * 프로세스 메모리에 기록하는 슬라이딩 윈도 방식 요청 제한.
 * 서버가 한 프로세스로만 실행되므로 Redis 없이 Map 으로 충분하다. 재시작하면 초기화된다.
 */
export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const { limit, windowMs } = options;
  const now = options.now ?? Date.now;
  const hits = new Map<string, number[]>();
  let lastSweep = now();

  function recent(key: string, current: number): number[] {
    const list = (hits.get(key) ?? []).filter((time) => current - time < windowMs);
    if (list.length > 0) hits.set(key, list);
    else hits.delete(key);
    return list;
  }

  // 오래된 키가 메모리에 계속 남지 않도록 가끔 전체를 정리한다.
  function sweep(current: number) {
    if (current - lastSweep < windowMs) return;
    lastSweep = current;
    for (const key of [...hits.keys()]) recent(key, current);
  }

  function result(list: number[], current: number, allowed: boolean): RateLimitResult {
    const oldest = list[0];
    const retryAfterMs = allowed || oldest === undefined ? 0 : windowMs - (current - oldest);
    return {
      allowed,
      remaining: Math.max(0, limit - list.length),
      retryAfterSeconds: Math.max(0, Math.ceil(retryAfterMs / 1000)),
    };
  }

  return {
    hit(key) {
      const current = now();
      sweep(current);
      const list = recent(key, current);
      if (list.length >= limit) return result(list, current, false);
      list.push(current);
      hits.set(key, list);
      return result(list, current, true);
    },
    peek(key) {
      const current = now();
      const list = recent(key, current);
      return result(list, current, list.length < limit);
    },
    reset(key) {
      hits.delete(key);
    },
    size() {
      return hits.size;
    },
  };
}

/** 개발 서버의 핫 리로드에도 기록이 유지되도록 전역에 하나만 만든다. */
export function getSharedRateLimiter(
  name: string,
  options: { limit: number; windowMs: number },
): RateLimiter {
  const store = globalThis as unknown as { __rateLimiters?: Map<string, RateLimiter> };
  store.__rateLimiters ??= new Map();
  let limiter = store.__rateLimiters.get(name);
  if (!limiter) {
    limiter = createRateLimiter(options);
    store.__rateLimiters.set(name, limiter);
  }
  return limiter;
}
