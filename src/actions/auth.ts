"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { getLoginGuard } from "@/lib/auth/login-guard";
import { parseClientInfo } from "@/lib/device/describe";
import { isAdminConfigured, verifyAdminLogin } from "@/lib/auth/password";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { recordLoginAttempt, type LoginResult } from "@/lib/login-history";
import { getClientIp } from "@/lib/request-ip";

export type LoginState = { error: string | null };

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const env = getEnv();
  const credentials = {
    username: env.ADMIN_USERNAME,
    passwordHashB64: env.ADMIN_PASSWORD_HASH_B64,
  };

  if (!isAdminConfigured(credentials)) {
    console.error(
      "[auth] 관리자 계정이 설정되지 않았습니다. ADMIN_USERNAME 과 ADMIN_PASSWORD_HASH_B64 를 확인하세요.",
    );
    return { error: "관리자 계정이 설정되지 않았습니다. 서버 환경 변수를 확인해 주세요." };
  }

  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders, env.TRUSTED_PROXY_HOPS);
  const userAgent = requestHeaders.get("user-agent") ?? "";
  const client = readClientField(formData.get("client"));
  // 스크립트가 언어 목록을 보내지 못했으면 요청 헤더의 언어를 쓴다.
  if (!client.langs) {
    const languages = parseClientInfo({ langs: acceptLanguages(requestHeaders.get("accept-language")) }).langs;
    if (languages) client.langs = languages;
  }
  const guard = getLoginGuard();
  // 기록과 위치 조회는 응답을 보낸 뒤에 한다. 잠긴 뒤의 반복 시도는 기록하지 않는다(잠긴 순간 한 번만 남긴다).
  const record = (result: LoginResult) => after(() => recordLoginAttempt({ result, ip, userAgent, client }));

  const gate = guard.check(ip);
  if (!gate.allowed) {
    return { error: lockedMessage(gate.retryAfterSeconds) };
  }

  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "아이디와 비밀번호를 입력해 주세요." };
  }

  const ok = await verifyAdminLogin(parsed.data, credentials);
  if (!ok) {
    const failure = guard.recordFailure(ip);
    console.warn(`[auth] 로그인 실패 (남은 시도 ${failure.remaining}회)`);
    record(failure.remaining <= 0 ? "LOCKED" : "FAILURE");
    if (failure.remaining <= 0) {
      return { error: lockedMessage(failure.retryAfterSeconds) };
    }
    // 아이디와 비밀번호 중 무엇이 틀렸는지는 알려주지 않는다.
    return {
      error: `아이디 또는 비밀번호가 올바르지 않습니다. (남은 시도 ${failure.remaining}회)`,
    };
  }

  guard.recordSuccess(ip);
  record("SUCCESS");
  const token = await createSessionToken(parsed.data.username);
  (await cookies()).set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  // __Host- 쿠키는 Secure, Path=/ 속성이 같이 와야 브라우저가 받아들인다.
  // 속성 없이 지우면 삭제 요청이 무시되어 로그아웃이 되지 않으므로, 같은 속성에 만료 시간만 0 으로 덮어쓴다.
  (await cookies()).set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
  redirect("/admin/login");
}

function lockedMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `로그인 시도가 너무 많습니다. 약 ${minutes}분 뒤에 다시 시도해 주세요.`;
}

/** 로그인 폼이 함께 보낸 기기 정보(JSON). 형식이 틀리면 빈 값. */
function readClientField(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length > 1000) return {};
  try {
    return parseClientInfo(JSON.parse(value));
  } catch {
    return {};
  }
}

/** "ko-KR,ko;q=0.9,en-US;q=0.8" → "ko-KR,ko,en-US" */
function acceptLanguages(header: string | null): string {
  return (header ?? "")
    .split(",")
    .map((part) => part.split(";")[0]!.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(",");
}
