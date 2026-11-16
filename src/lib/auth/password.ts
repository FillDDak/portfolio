import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

// 아이디가 틀렸을 때도 bcrypt 비교를 한 번 수행해서, 응답 시간으로 아이디 존재 여부를 알 수 없게 한다.
// (임의의 값으로 만든 해시라 어떤 비밀번호와도 일치하지 않는다.)
const DUMMY_HASH = "$2b$12$dk20Q.aL.j42IfqsGosHjeamla0CsfAcqutNqhj59F4kqB8FelfOG";

function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

/** 환경 변수의 base64 값을 bcrypt 해시 문자열로 되돌린다. 형식이 틀리면 null. */
export function decodePasswordHash(encoded: string | undefined): string | null {
  if (!encoded) return null;
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8").trim();
    return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export type AdminCredentials = { username: string | undefined; passwordHashB64: string | undefined };

/** 관리자 계정이 환경 변수에 제대로 설정되어 있는지 */
export function isAdminConfigured(credentials: AdminCredentials): boolean {
  return Boolean(credentials.username) && decodePasswordHash(credentials.passwordHashB64) !== null;
}

/** 아이디와 비밀번호가 환경 변수의 관리자 계정과 일치하는지 확인한다. */
export async function verifyAdminLogin(
  input: { username: string; password: string },
  credentials: AdminCredentials,
): Promise<boolean> {
  const hash = decodePasswordHash(credentials.passwordHashB64);
  const usernameMatches = Boolean(credentials.username) && safeEqual(input.username, credentials.username ?? "");
  const passwordMatches = await bcrypt.compare(input.password, hash ?? DUMMY_HASH);
  return usernameMatches && passwordMatches && hash !== null;
}
