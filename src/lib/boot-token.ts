import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * 서버 프로세스가 시작될 때 한 번 만들어지는 임의의 값.
 * 서버가 자기 자신에게 보내는 내부 요청(시작 직후 캐시 비우기)을 외부 요청과 구분하는 데 쓴다.
 * 프로세스 메모리에만 있고 밖으로 나가지 않는다.
 */
export function getBootToken(): string {
  const store = globalThis as unknown as { __bootToken?: string };
  store.__bootToken ??= randomBytes(32).toString("hex");
  return store.__bootToken;
}

export function isBootToken(value: string | null): boolean {
  if (!value) return false;
  const expected = Buffer.from(getBootToken());
  const given = Buffer.from(value);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
