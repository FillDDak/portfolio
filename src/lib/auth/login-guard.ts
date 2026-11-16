import { createRateLimiter, type RateLimiter } from "@/lib/rate-limit";

export const LOGIN_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 } as const;

export type LoginGuard = {
  /** 지금 로그인을 시도해도 되는지 */
  check(ip: string): { allowed: boolean; retryAfterSeconds: number };
  /** 실패를 기록하고 남은 시도 횟수를 돌려준다 */
  recordFailure(ip: string): { remaining: number; retryAfterSeconds: number };
  /** 성공하면 실패 기록을 지운다 */
  recordSuccess(ip: string): void;
};

/**
 * 로그인 시도 제한: 같은 IP 에서 15분 동안 5번 틀리면 잠근다.
 * 실패만 세고, 성공하면 기록을 지운다.
 */
export function createLoginGuard(options?: {
  limit?: number;
  windowMs?: number;
  now?: () => number;
}): LoginGuard {
  const limiter: RateLimiter = createRateLimiter({
    limit: options?.limit ?? LOGIN_LIMIT.limit,
    windowMs: options?.windowMs ?? LOGIN_LIMIT.windowMs,
    now: options?.now,
  });
  const key = (ip: string) => `login:${ip}`;

  return {
    check(ip) {
      const state = limiter.peek(key(ip));
      return { allowed: state.allowed, retryAfterSeconds: state.retryAfterSeconds };
    },
    recordFailure(ip) {
      limiter.hit(key(ip));
      const state = limiter.peek(key(ip));
      return { remaining: state.remaining, retryAfterSeconds: state.retryAfterSeconds };
    },
    recordSuccess(ip) {
      limiter.reset(key(ip));
    },
  };
}

/** 서버 프로세스 전체에서 하나만 쓰는 로그인 제한 */
export function getLoginGuard(): LoginGuard {
  const store = globalThis as unknown as { __loginGuard?: LoginGuard };
  store.__loginGuard ??= createLoginGuard();
  return store.__loginGuard;
}
