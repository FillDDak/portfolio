import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { describeMailError, sendOwnerNotice } from "@/lib/mail/contact-mail";
import { buildAlertMail, createMonitorAlerter } from "./alert";
import { CHECK_CACHE_MS, getSharedStatusChecker } from "./check";

/**
 * 서버가 1분마다 감시 주소를 직접 확인하고, 장애나 복구가 생기면 CONTACT_TO 로 메일을 보낸다.
 * 서비스 상태 페이지와 같은 검사기를 써서, 방문자가 페이지를 열어도 대상 서버에 요청이 더 가지 않는다.
 * 운영 서버에서 시작할 때 한 번만 호출한다(src/instrumentation.ts).
 */
// 검사기가 결과를 60초 동안 기억하므로, 그보다 조금 길게 잡아야 매번 새로 확인한다.
export function startMonitorAlerts(intervalMs = CHECK_CACHE_MS + 5_000): void {
  const store = globalThis as unknown as { __monitorAlertsStarted?: boolean };
  if (store.__monitorAlertsStarted) return;
  store.__monitorAlertsStarted = true;

  const alerter = createMonitorAlerter();
  let running = false;

  const tick = async () => {
    // 확인이 오래 걸려도 겹쳐서 돌지 않게 한다.
    if (running) return;
    running = true;
    try {
      const monitors = await db.monitor.findMany({
        where: { isActive: true },
        select: { id: true, name: true, url: true },
      });
      const checker = getSharedStatusChecker();
      const observations = await Promise.all(
        monitors.map(async (monitor) => ({ ...monitor, result: await checker.check(monitor.url) })),
      );
      const events = alerter.observe(observations);
      if (events.length === 0) return;

      for (const event of events) {
        console.log(`[monitor] ${event.kind === "down" ? "장애" : "복구"}: ${event.name} (${event.url})`);
      }
      try {
        await sendOwnerNotice(buildAlertMail(events, getEnv().SITE_URL));
      } catch (error) {
        console.error("[monitor] 알림 메일 발송 실패", describeMailError(error));
      }
    } catch (error) {
      console.error("[monitor] 상태 확인 실패", error);
    } finally {
      running = false;
    }
  };

  setTimeout(tick, 30_000).unref();
  setInterval(tick, intervalMs).unref();
}
