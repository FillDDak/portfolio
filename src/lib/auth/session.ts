import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { getEnv } from "@/lib/env";

/** 세션 유지 시간: 12시간. 지나면 다시 로그인해야 한다. */
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

const isProduction = process.env.NODE_ENV === "production";

/**
 * 운영에서는 __Host- 접두사를 붙인다.
 * 이 접두사가 붙은 쿠키는 브라우저가 Secure, Path=/, Domain 없음 조건을 강제하므로
 * 하위 도메인이나 http 연결에서 덮어쓸 수 없다.
 */
export const SESSION_COOKIE_NAME = isProduction ? "__Host-admin_session" : "admin_session";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;

export type AdminSession = { username: string; expiresAt: number };

function getKey(): Uint8Array {
  // 비밀값 길이와 상관없이 A256GCM 에 맞는 32바이트 키를 만든다.
  return createHash("sha256").update(getEnv().SESSION_SECRET).digest();
}

/** 암호화된 세션 토큰(JWE)을 만든다. 내용은 서버만 읽고 바꿀 수 있다. */
export async function createSessionToken(username: string, now = Date.now()): Promise<string> {
  const issuedAt = Math.floor(now / 1000);
  return new EncryptJWT({ sub: username })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_MAX_AGE_SECONDS)
    .setAudience("admin")
    .encrypt(getKey());
}

/** 토큰을 복호화하고 만료를 확인한다. 위조됐거나 만료됐으면 null. */
export async function readSessionToken(
  token: string | undefined,
  now = Date.now(),
): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, getKey(), {
      audience: "admin",
      currentDate: new Date(now),
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    });
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    // 관리자 아이디가 바뀌었다면 예전 세션은 더 이상 유효하지 않다.
    const current = getEnv().ADMIN_USERNAME;
    if (!current || payload.sub !== current) return null;
    return { username: payload.sub, expiresAt: payload.exp * 1000 };
  } catch {
    return null;
  }
}
