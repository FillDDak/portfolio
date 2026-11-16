import { NextResponse, type NextRequest } from "next/server";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * /admin 과 /api/admin 으로 들어오는 요청을 페이지 코드에 닿기 전에 한 번 걸러낸다.
 * 여기서 통과해도 각 페이지, Server Action, API 가 requireAdmin() 으로 다시 확인한다.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    // 이미 로그인했으면 로그인 화면 대신 대시보드로 보낸다.
    return session ? NextResponse.redirect(new URL("/admin", request.url)) : NextResponse.next();
  }

  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, message: "로그인이 필요합니다." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
