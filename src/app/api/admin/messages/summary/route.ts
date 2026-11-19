import { connection } from "next/server";
import { requireAdminForApi, UnauthorizedError } from "@/lib/auth/guard";
import { getMessageSummary, messageSignature } from "@/lib/data/message-summary";

/** 받은 문의 상태(읽지 않은 수 등). 관리자 화면이 2초마다 호출한다. */
export async function GET() {
  // 빌드할 때 미리 실행되지 않고 요청이 올 때만 실행되게 한다.
  await connection();
  try {
    await requireAdminForApi();
    const summary = await getMessageSummary();
    return Response.json(
      { ok: true, ...summary, signature: messageSignature(summary) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ ok: false, message: error.message }, { status: 401 });
    }
    console.error("[messages] 상태 조회 실패", error);
    return Response.json({ ok: false, message: "조회하지 못했습니다." }, { status: 500 });
  }
}
