/** 상태 페이지: 등록된 주소가 응답하는지 서버에서 확인한다. */

export const CHECK_TIMEOUT_MS = 5_000;
export const CHECK_CACHE_MS = 60_000;

export type CheckResult = {
  state: "up" | "down";
  /** 응답 헤더를 받을 때까지 걸린 시간. 응답을 받지 못했으면 null */
  responseMs: number | null;
  /** 오류일 때 방문자에게 보여 줄 이유 */
  reason: string | null;
  /** 확인한 시각(ms) */
  checkedAt: number;
};

type CheckDeps = {
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
};

/**
 * 주소에 GET 요청을 한 번 보내 확인한다.
 * 리다이렉트는 따라가고, 마지막 응답이 2xx 면 정상으로 본다. 본문은 읽지 않는다.
 */
export async function checkUrl(url: string, deps: CheckDeps = {}): Promise<CheckResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? Date.now;
  const timeoutMs = deps.timeoutMs ?? CHECK_TIMEOUT_MS;
  const startedAt = now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: { "user-agent": "status-check/1.0", accept: "*/*" },
    });
    const responseMs = Math.max(0, Math.round(now() - startedAt));
    // 본문은 필요 없으므로 받지 않고 연결을 정리한다.
    void response.body?.cancel().catch(() => {});
    if (response.ok) return { state: "up", responseMs, reason: null, checkedAt: now() };
    return { state: "down", responseMs, reason: `HTTP ${response.status} 응답`, checkedAt: now() };
  } catch {
    const reason = controller.signal.aborted
      ? `${Math.round(timeoutMs / 1000)}초 안에 응답 없음`
      : "연결할 수 없음";
    return { state: "down", responseMs: null, reason, checkedAt: now() };
  } finally {
    clearTimeout(timer);
  }
}

export type StatusChecker = {
  check(url: string): Promise<CheckResult>;
};

/**
 * 확인 결과를 주소별로 잠시 기억해 두는 검사기.
 * 방문자가 새로고침을 반복해도 대상 서버에는 주소당 60초에 한 번만 요청이 간다.
 * 같은 주소를 동시에 확인하려는 요청은 진행 중인 확인 하나를 함께 기다린다.
 */
export function createStatusChecker(
  options: CheckDeps & { cacheMs?: number } = {},
): StatusChecker {
  const now = options.now ?? Date.now;
  const cacheMs = options.cacheMs ?? CHECK_CACHE_MS;
  const results = new Map<string, CheckResult>();
  const pending = new Map<string, Promise<CheckResult>>();

  return {
    check(url) {
      const cached = results.get(url);
      if (cached && now() - cached.checkedAt < cacheMs) return Promise.resolve(cached);

      const running = pending.get(url);
      if (running) return running;

      const started = checkUrl(url, options)
        .then((result) => {
          // 더 이상 감시하지 않는 주소가 쌓이지 않도록 지난 결과는 지운다.
          for (const [key, value] of results) {
            if (now() - value.checkedAt >= cacheMs) results.delete(key);
          }
          results.set(url, result);
          return result;
        })
        .finally(() => pending.delete(url));
      pending.set(url, started);
      return started;
    },
  };
}

/** 개발 서버의 핫 리로드에도 결과가 유지되도록 전역에 하나만 만든다. */
export function getSharedStatusChecker(): StatusChecker {
  const store = globalThis as unknown as { __statusChecker?: StatusChecker };
  store.__statusChecker ??= createStatusChecker();
  return store.__statusChecker;
}
