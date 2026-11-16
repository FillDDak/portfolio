import { createHash, createHmac } from "node:crypto";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 한국 시간(Asia/Seoul) 기준 날짜. "2026-11-17" */
export function kstDate(now: Date | number = Date.now()): string {
  const time = typeof now === "number" ? now : now.getTime();
  return new Date(time + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 한국 시간 기준으로 days 일 전(0 이면 오늘) 날짜의 0시를 UTC 시각으로 돌려준다. */
export function kstDayStart(date: string): Date {
  return new Date(Date.parse(`${date}T00:00:00Z`) - KST_OFFSET_MS);
}

/** date 에서 days 일을 더한(음수면 뺀) 날짜 */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * 방문자를 구분하는 해시. IP 원문은 저장하지 않는다.
 *
 * 날짜마다 다른 솔트(비밀값 + 날짜로 만든 값)를 섞기 때문에
 * - 해시에서 IP 를 되돌릴 수 없고
 * - 같은 사람이라도 날이 바뀌면 다른 값이 되어 며칠에 걸쳐 추적할 수 없다.
 */
export function visitorHash(input: {
  ip: string;
  userAgent: string;
  secret: string;
  date: string;
}): string {
  const dailySalt = createHmac("sha256", input.secret).update(`visitor-salt:${input.date}`).digest();
  return createHash("sha256")
    .update(dailySalt)
    .update(input.ip)
    .update("\n")
    .update(input.userAgent)
    .digest("hex")
    .slice(0, 32);
}
