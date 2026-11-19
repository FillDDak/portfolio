import { requireAdminForApi, UnauthorizedError } from "@/lib/auth/guard";
import { findTechIcon, type TechIcon } from "@/lib/tech-icons";

export type TechIconsResponse = { ok: true; icons: Record<string, TechIcon | null> } | { ok: false; message: string };

const MAX_NAMES = 30;
const MAX_NAME_LENGTH = 60;

/** 관리자 화면 입력 중 미리보기: 이름마다 붙을 아이콘(없으면 null). 예: ?names=Java,Spring Boot */
export async function GET(request: Request) {
  try {
    await requireAdminForApi();
    const raw = new URL(request.url).searchParams.get("names") ?? "";
    const names = [...new Set(raw.split(",").map((name) => name.trim()).filter(Boolean))]
      .slice(0, MAX_NAMES)
      .map((name) => name.slice(0, MAX_NAME_LENGTH));
    const icons = Object.fromEntries(names.map((name) => [name, findTechIcon(name)]));
    return Response.json({ ok: true, icons } satisfies TechIconsResponse, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ ok: false, message: error.message } satisfies TechIconsResponse, { status: 401 });
    }
    throw error;
  }
}
