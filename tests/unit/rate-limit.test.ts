import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

const MINUTE = 60_000;

function setup(limit: number, windowMs: number) {
  let time = 1_000_000;
  const limiter = createRateLimiter({ limit, windowMs, now: () => time });
  return {
    limiter,
    advance(ms: number) {
      time += ms;
    },
  };
}

describe("createRateLimiter", () => {
  it("제한 횟수까지 허용하고 그다음은 막는다 (문의: 10분에 3회)", () => {
    const { limiter } = setup(3, 10 * MINUTE);
    expect(limiter.hit("ip").allowed).toBe(true);
    expect(limiter.hit("ip").allowed).toBe(true);
    expect(limiter.hit("ip").remaining).toBe(0);
    const blocked = limiter.hit("ip");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(600);
  });

  it("키가 다르면 따로 센다", () => {
    const { limiter } = setup(1, MINUTE);
    expect(limiter.hit("a").allowed).toBe(true);
    expect(limiter.hit("a").allowed).toBe(false);
    expect(limiter.hit("b").allowed).toBe(true);
  });

  it("가장 오래된 요청이 창 밖으로 나가면 다시 허용한다", () => {
    const { limiter, advance } = setup(2, 10 * MINUTE);
    limiter.hit("ip");
    advance(4 * MINUTE);
    limiter.hit("ip");
    advance(5 * MINUTE);
    const blocked = limiter.hit("ip");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
    advance(MINUTE);
    expect(limiter.hit("ip").allowed).toBe(true);
  });

  it("막힌 요청은 횟수에 넣지 않는다", () => {
    const { limiter, advance } = setup(1, MINUTE);
    limiter.hit("ip");
    for (let i = 0; i < 5; i += 1) limiter.hit("ip");
    advance(MINUTE);
    expect(limiter.hit("ip").allowed).toBe(true);
  });

  it("peek 은 기록하지 않고 상태만 알려준다", () => {
    const { limiter } = setup(1, MINUTE);
    expect(limiter.peek("ip").allowed).toBe(true);
    expect(limiter.peek("ip").allowed).toBe(true);
    limiter.hit("ip");
    expect(limiter.peek("ip").allowed).toBe(false);
  });

  it("reset 하면 바로 다시 허용한다 (로그인 성공 시 사용)", () => {
    const { limiter } = setup(1, MINUTE);
    limiter.hit("ip");
    limiter.reset("ip");
    expect(limiter.hit("ip").allowed).toBe(true);
  });

  it("시간이 지난 키는 메모리에서 정리한다", () => {
    const { limiter, advance } = setup(1, MINUTE);
    for (let i = 0; i < 100; i += 1) limiter.hit(`ip-${i}`);
    expect(limiter.size()).toBe(100);
    advance(2 * MINUTE);
    limiter.hit("new");
    expect(limiter.size()).toBe(1);
  });
});
