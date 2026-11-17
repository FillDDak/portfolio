import { describe, expect, it, vi } from "vitest";
import { checkUrl, createStatusChecker } from "@/lib/status/check";

function clock(start = 1_000_000) {
  let current = start;
  return { now: () => current, advance: (ms: number) => (current += ms) };
}

function respond(status: number, onCall?: () => void): typeof fetch {
  return (async () => {
    onCall?.();
    return new Response(null, { status });
  }) as typeof fetch;
}

describe("checkUrl", () => {
  it("2xx 응답이면 정상이고 응답 시간을 잰다", async () => {
    const time = clock();
    const result = await checkUrl("https://example.com", {
      now: time.now,
      fetchImpl: respond(200, () => time.advance(123)),
    });
    expect(result).toEqual({ state: "up", responseMs: 123, reason: null, checkedAt: time.now() });
  });

  it("리다이렉트를 따라가고 본문은 캐시하지 않도록 요청한다", async () => {
    const fetchImpl = vi.fn(respond(204));
    await checkUrl("https://example.com", { fetchImpl });
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init).toMatchObject({ method: "GET", redirect: "follow", cache: "no-store" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([404, 500, 503])("HTTP %i 응답이면 오류로 본다", async (status) => {
    const result = await checkUrl("https://example.com", { fetchImpl: respond(status) });
    expect(result.state).toBe("down");
    expect(result.reason).toBe(`HTTP ${status} 응답`);
    expect(result.responseMs).not.toBeNull();
  });

  it("연결에 실패하면 오류로 본다", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const result = await checkUrl("https://example.com", { fetchImpl });
    expect(result).toMatchObject({ state: "down", responseMs: null, reason: "연결할 수 없음" });
  });

  it("제한 시간 안에 응답이 없으면 요청을 끊고 오류로 본다", async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = ((_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        })) as typeof fetch;
      const pending = checkUrl("https://example.com", { fetchImpl });
      await vi.advanceTimersByTimeAsync(4_999);
      let settled = false;
      void pending.then(() => (settled = true));
      await Promise.resolve();
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await pending).toMatchObject({
        state: "down",
        responseMs: null,
        reason: "5초 안에 응답 없음",
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("createStatusChecker", () => {
  it("60초 안에는 다시 요청하지 않고 기억한 결과를 돌려준다", async () => {
    const time = clock();
    const fetchImpl = vi.fn(respond(200));
    const checker = createStatusChecker({ fetchImpl, now: time.now });

    const first = await checker.check("https://example.com");
    time.advance(59_999);
    expect(await checker.check("https://example.com")).toBe(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    time.advance(1);
    const second = await checker.check("https://example.com");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(second.checkedAt).toBe(time.now());
  });

  it("오류 결과도 60초 동안 기억한다", async () => {
    const time = clock();
    const fetchImpl = vi.fn(respond(500));
    const checker = createStatusChecker({ fetchImpl, now: time.now });
    await checker.check("https://example.com");
    time.advance(30_000);
    expect((await checker.check("https://example.com")).state).toBe("down");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("주소마다 따로 기억한다", async () => {
    const fetchImpl = vi.fn(respond(200));
    const checker = createStatusChecker({ fetchImpl });
    await checker.check("https://a.example.com");
    await checker.check("https://b.example.com");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("같은 주소를 동시에 확인하면 요청은 한 번만 보낸다", async () => {
    const fetchImpl = vi.fn(respond(200));
    const checker = createStatusChecker({ fetchImpl });
    const [a, b] = await Promise.all([
      checker.check("https://example.com"),
      checker.check("https://example.com"),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });
});
