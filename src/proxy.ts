import { NextResponse, type NextRequest } from "next/server";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { db } from "@/lib/db";

const PROJECT_PATH = /^\/projects\/([^/]+)\/?$/;
const POST_PATH = /^\/blog\/([^/]+)\/?$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * 페이지 코드에 닿기 전에 요청을 한 번 걸러낸다.
 * - /admin, /api/admin: 로그인하지 않은 요청을 막는다. 통과해도 각 페이지, Server Action, API 가
 *   requireAdmin() 으로 다시 확인한다.
 * - /projects/<slug>, /blog/<slug>: 없거나 비공개인 프로젝트·글은 여기서 404 로 응답한다.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const project = pathname.match(PROJECT_PATH);
  if (project) return (await projectExists(project[1] ?? "")) ? NextResponse.next() : notFound(request);

  const post = pathname.match(POST_PATH);
  if (post) return (await postExists(post[1] ?? "")) ? NextResponse.next() : notFound(request);

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

/**
 * 프로젝트 상세 페이지는 미리 만들어 둔 틀을 먼저 보내고 내용을 이어서 보내기 때문에,
 * 페이지 안에서 "없음"을 알게 되면 이미 200 으로 응답이 시작된 뒤다.
 * 검색 엔진이 없는 주소를 정상 페이지로 보지 않도록 응답을 시작하기 전에 확인한다.
 */
async function projectExists(slug: string): Promise<boolean> {
  if (!SLUG.test(slug)) return false;
  try {
    const found = await db.project.findFirst({
      where: { slug, isPublished: true },
      select: { id: true },
    });
    return found !== null;
  } catch (error) {
    // 확인에 실패하면 막지 않고 페이지가 직접 처리하게 둔다.
    console.error("[proxy] 프로젝트 확인 실패", error);
    return true;
  }
}

/** 글 상세도 프로젝트 상세와 같은 이유로 응답을 시작하기 전에 확인한다. */
async function postExists(slug: string): Promise<boolean> {
  if (!SLUG.test(slug)) return false;
  try {
    const found = await db.post.findFirst({
      where: { slug, isPublished: true },
      select: { id: true },
    });
    return found !== null;
  } catch (error) {
    console.error("[proxy] 글 확인 실패", error);
    return true;
  }
}

/** 어떤 페이지와도 맞지 않는 주소로 넘겨서 404 화면(app/not-found.tsx)과 404 상태 코드로 응답하게 한다. */
function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL("/_/not-found", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/projects/:slug", "/blog/:slug"],
};
