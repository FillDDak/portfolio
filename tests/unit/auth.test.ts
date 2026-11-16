import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { decodePasswordHash, isAdminConfigured, verifyAdminLogin } from "@/lib/auth/password";
import {
  createSessionToken,
  readSessionToken,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";
import { resetEnvCache } from "@/lib/env";

const password = "correct horse battery";
// 테스트가 느려지지 않도록 낮은 cost 로 만든다.
const hash = bcrypt.hashSync(password, 4);
const credentials = {
  username: "admin",
  passwordHashB64: Buffer.from(hash).toString("base64"),
};

describe("관리자 비밀번호 검증", () => {
  it("아이디와 비밀번호가 모두 맞아야 통과한다", async () => {
    expect(await verifyAdminLogin({ username: "admin", password }, credentials)).toBe(true);
    expect(await verifyAdminLogin({ username: "admin", password: "wrong" }, credentials)).toBe(false);
    expect(await verifyAdminLogin({ username: "other", password }, credentials)).toBe(false);
  });

  it("계정이 설정되지 않았으면 무엇을 넣어도 실패한다", async () => {
    const empty = { username: undefined, passwordHashB64: undefined };
    expect(isAdminConfigured(empty)).toBe(false);
    expect(await verifyAdminLogin({ username: "", password: "" }, empty)).toBe(false);
    expect(await verifyAdminLogin({ username: "admin", password }, empty)).toBe(false);
  });

  it("base64 로 감싼 bcrypt 해시만 받아들인다", () => {
    expect(decodePasswordHash(credentials.passwordHashB64)).toBe(hash);
    expect(decodePasswordHash(Buffer.from("plain-password").toString("base64"))).toBeNull();
    expect(decodePasswordHash("")).toBeNull();
    expect(isAdminConfigured(credentials)).toBe(true);
  });
});

describe("세션 토큰", () => {
  beforeAll(() => {
    vi.stubEnv("DATABASE_URL", "file:./data/test.db");
    vi.stubEnv("UPLOAD_DIR", "./data/uploads");
    vi.stubEnv("SITE_URL", "http://localhost:3000");
    vi.stubEnv("SESSION_SECRET", "s".repeat(40));
    vi.stubEnv("ANALYTICS_SECRET", "a".repeat(40));
    vi.stubEnv("ADMIN_USERNAME", "admin");
    resetEnvCache();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    resetEnvCache();
  });

  it("만든 토큰을 다시 읽을 수 있다", async () => {
    const now = Date.now();
    const token = await createSessionToken("admin", now);
    const session = await readSessionToken(token, now + 1000);
    expect(session?.username).toBe("admin");
    expect(session?.expiresAt).toBe((Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS) * 1000);
  });

  it("내용이 암호화되어 있어 토큰에서 아이디가 보이지 않는다", async () => {
    const token = await createSessionToken("admin");
    const decodedParts = token
      .split(".")
      .map((part) => Buffer.from(part, "base64url").toString("latin1"))
      .join("|");
    expect(decodedParts).not.toContain('"sub"');
  });

  it("12시간이 지나면 만료된다", async () => {
    const now = Date.now();
    const token = await createSessionToken("admin", now);
    const justBefore = now + (SESSION_MAX_AGE_SECONDS - 60) * 1000;
    const after = now + (SESSION_MAX_AGE_SECONDS + 60) * 1000;
    expect(await readSessionToken(token, justBefore)).not.toBeNull();
    expect(await readSessionToken(token, after)).toBeNull();
  });

  it("변조된 토큰과 빈 값은 거부한다", async () => {
    const token = await createSessionToken("admin");
    const tampered = token.slice(0, -4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(await readSessionToken(tampered)).toBeNull();
    expect(await readSessionToken("not-a-token")).toBeNull();
    expect(await readSessionToken(undefined)).toBeNull();
  });

  it("다른 비밀값으로 만든 토큰은 거부한다", async () => {
    const token = await createSessionToken("admin");
    vi.stubEnv("SESSION_SECRET", "x".repeat(40));
    resetEnvCache();
    expect(await readSessionToken(token)).toBeNull();
    vi.stubEnv("SESSION_SECRET", "s".repeat(40));
    resetEnvCache();
  });

  it("관리자 아이디가 바뀌면 예전 세션은 무효가 된다", async () => {
    const token = await createSessionToken("admin");
    vi.stubEnv("ADMIN_USERNAME", "newadmin");
    resetEnvCache();
    expect(await readSessionToken(token)).toBeNull();
    vi.stubEnv("ADMIN_USERNAME", "admin");
    resetEnvCache();
  });
});
