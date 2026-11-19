import { connection } from "next/server";
import { getRealtimeTracker } from "@/lib/analytics/realtime";
import { requireAdminForApi, UnauthorizedError } from "@/lib/auth/guard";

/** 실시간 접속자 수: 최근 35초 안에 하트비트를 보낸 세션 수. 대시보드가 2초마다 호출한다. */
export async function GET() {
  // 빌드할 때 미리 실행되지 않고 요청이 올 때만 실행되게 한다.
  await connection();
  try {
    await requireAdminForApi();
    return Response.json(
      { ok: true, count: getRealtimeTracker().count(), at: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ ok: false, message: error.message }, { status: 401 });
    }
    console.error("[realtime] 조회 실패", error);
    return Response.json({ ok: false, message: "조회하지 못했습니다." }, { status: 500 });
  }
}
