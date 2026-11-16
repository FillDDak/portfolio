import { describe, expect, it } from "vitest";
import { createLoginGuard } from "@/lib/auth/login-guard";

const MINUTE = 60_000;

function setup() {
  let time = 5_000_000;
  const guard = createLoginGuard({ now: () => time });
  return {
    guard,
    advance(ms: number) {
      time += ms;
    },
  };
}

describe("로그인 시도 제한 (15분에 5회)", () => {
  it("5번 틀리기 전까지는 시도할 수 있다", () => {
    const { guard } = setup();
    for (let i = 0; i < 4; i += 1) {
      expect(guard.check("1.1.1.1").allowed).toBe(true);
      expect(guard.recordFailure("1.1.1.1").remaining).toBe(4 - i);
    }
    expect(guard.check("1.1.1.1").allowed).toBe(true);
  });

  it("5번 틀리면 잠기고 남은 시간을 알려준다", () => {
    const { guard } = setup();
    for (let i = 0; i < 5; i += 1) guard.recordFailure("1.1.1.1");
    const state = guard.check("1.1.1.1");
    expect(state.allowed).toBe(false);
    expect(state.retryAfterSeconds).toBe(15 * 60);
  });

  it("다른 IP 는 영향을 받지 않는다", () => {
    const { guard } = setup();
    for (let i = 0; i < 5; i += 1) guard.recordFailure("1.1.1.1");
    expect(guard.check("2.2.2.2").allowed).toBe(true);
  });

  it("15분이 지나면 다시 시도할 수 있다", () => {
    const { guard, advance } = setup();
    for (let i = 0; i < 5; i += 1) guard.recordFailure("1.1.1.1");
    advance(14 * MINUTE);
    expect(guard.check("1.1.1.1").allowed).toBe(false);
    advance(MINUTE);
    expect(guard.check("1.1.1.1").allowed).toBe(true);
  });

  it("로그인에 성공하면 실패 기록이 지워진다", () => {
    const { guard } = setup();
    for (let i = 0; i < 4; i += 1) guard.recordFailure("1.1.1.1");
    guard.recordSuccess("1.1.1.1");
    expect(guard.recordFailure("1.1.1.1").remaining).toBe(4);
  });

  it("잠긴 뒤에 계속 시도해도 잠금 시간이 늘어나지 않는다", () => {
    const { guard, advance } = setup();
    for (let i = 0; i < 5; i += 1) guard.recordFailure("1.1.1.1");
    advance(10 * MINUTE);
    for (let i = 0; i < 10; i += 1) guard.recordFailure("1.1.1.1");
    advance(5 * MINUTE);
    expect(guard.check("1.1.1.1").allowed).toBe(true);
  });
});
