import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEnv, resetEnvCache } from "@/lib/env";

const base = {
  DATABASE_URL: "file:./data/test.db",
  UPLOAD_DIR: "./data/uploads",
  SITE_URL: "https://fillddak.kr/",
  SESSION_SECRET: "s".repeat(32),
  ANALYTICS_SECRET: "a".repeat(32),
};

describe("getEnv", () => {
  beforeEach(() => {
    resetEnvCache();
    vi.unstubAllEnvs();
    for (const [key, value] of Object.entries(base)) vi.stubEnv(key, value);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetEnvCache();
  });

  it("필수 값이 있으면 통과하고 기본값을 채운다", () => {
    vi.stubEnv("SMTP_PORT", "");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "");
    vi.stubEnv("PAGEVIEW_RETENTION_DAYS", "");
    const env = getEnv();
    expect(env.SITE_URL).toBe("https://fillddak.kr");
    expect(env.PAGEVIEW_RETENTION_DAYS).toBe(180);
  });

  it("빈 문자열로 둔 선택 값은 없는 것으로 본다", () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "  ");
    expect(getEnv().TURNSTILE_SITE_KEY).toBeUndefined();
  });

  it("세션 비밀값이 짧으면 어떤 변수가 문제인지 알려준다", () => {
    vi.stubEnv("SESSION_SECRET", "short");
    expect(() => getEnv()).toThrow(/SESSION_SECRET/);
  });
});
