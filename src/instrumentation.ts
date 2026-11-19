/** 서버 프로세스가 시작될 때 한 번 실행된다. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // 개발 서버는 미리 만들어 둔 페이지를 쓰지 않으므로 운영 빌드에서만 실행한다.
  if (process.env.NODE_ENV !== "production") return;

  const { getBootToken } = await import("@/lib/boot-token");
  const token = getBootToken();
  const port = process.env.PORT ?? "3000";
  const url = `http://127.0.0.1:${port}/api/internal/revalidate`;

  // 서버가 요청을 받을 수 있게 된 뒤에 호출해야 하므로, 성공할 때까지 짧게 다시 시도한다.
  let attempt = 0;
  const run = async () => {
    attempt += 1;
    try {
      const response = await fetch(url, { method: "POST", headers: { "x-boot-token": token } });
      if (response.ok) {
        console.log("[boot] 공개 페이지 캐시를 비웠습니다. 운영 DB 내용으로 다시 만들어집니다.");
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt >= 40) {
        console.error("[boot] 시작 시 캐시 비우기에 실패했습니다:", error);
        return;
      }
      setTimeout(run, 500).unref();
    }
  };
  setTimeout(run, 300).unref();

  // 보관 기간(기본 180일)이 지난 조회 상세 로그를 하루에 한 번 지운다. 일별 집계는 남는다.
  const purge = async () => {
    try {
      const { purgeOldPageViews } = await import("@/lib/analytics/record");
      const removed = await purgeOldPageViews();
      if (removed > 0) console.log(`[stats] 보관 기간이 지난 조회 기록 ${removed}건을 삭제했습니다.`);
    } catch (error) {
      console.error("[stats] 조회 기록 정리에 실패했습니다:", error);
    }
    // 로그인 기록은 90일 동안 보관한다.
    try {
      const { purgeOldLoginAttempts } = await import("@/lib/login-history");
      const removed = await purgeOldLoginAttempts();
      if (removed > 0) console.log(`[auth] 보관 기간이 지난 로그인 기록 ${removed}건을 삭제했습니다.`);
    } catch (error) {
      console.error("[auth] 로그인 기록 정리에 실패했습니다:", error);
    }
  };
  setTimeout(purge, 60_000).unref();
  setInterval(purge, 24 * 60 * 60 * 1000).unref();

  // 상태 감시 주소를 1분마다 확인하고, 장애·복구가 생기면 메일로 알린다.
  const { startMonitorAlerts } = await import("@/lib/status/monitor-loop");
  startMonitorAlerts();
}
