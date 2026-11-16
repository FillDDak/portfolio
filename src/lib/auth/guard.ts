import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { readSessionToken, SESSION_COOKIE_NAME, type AdminSession } from "./session";

/** 현재 요청의 관리자 세션. 로그인하지 않았으면 null. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  // 만료 여부는 현재 시각과 비교해야 하므로 실제 요청이 올 때만 확인한다.
  // (링크를 미리 불러오는 사전 렌더링 단계에서는 현재 시각을 쓸 수 없다.)
  await connection();
  return readSessionToken(token);
}

/**
 * 관리자 페이지와 Server Action 의 첫 줄에서 호출한다.
 * proxy 에서도 검사하지만, proxy 설정이 빠지거나 우회되어도 안전하도록 서버 코드에서 한 번 더 확인한다.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("로그인이 필요합니다.");
    this.name = "UnauthorizedError";
  }
}

/** Route Handler 용. 리다이렉트 대신 예외를 던져 401 로 응답하게 한다. */
export async function requireAdminForApi(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
