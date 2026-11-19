/** 상태 감시 장애·복구 알림: 어떤 확인 결과에서 알림을 보낼지 정한다. */
import { escapeHtml } from "@/lib/mail/contact-mail";
import { displayUrl, formatDateTime } from "@/lib/format";
import type { CheckResult } from "./check";

/** 연속으로 이만큼 실패해야 장애로 본다. 한 번의 일시적인 실패로 알림이 가지 않게 한다. */
export const ALERT_FAIL_THRESHOLD = 2;

export type MonitorObservation = {
  id: number;
  name: string;
  url: string;
  result: CheckResult;
};

export type AlertEvent =
  | {
      kind: "down";
      name: string;
      url: string;
      reason: string;
      checkedAt: number;
    }
  | {
      kind: "recovered";
      name: string;
      url: string;
      responseMs: number | null;
      downSince: number;
      checkedAt: number;
    };

type MonitorState = {
  lastCheckedAt: number;
  failures: number;
  downSince: number;
  alerted: boolean;
};

export type MonitorAlerter = {
  observe(observations: MonitorObservation[]): AlertEvent[];
};

/**
 * 감시 주소별 상태를 기억하고, 바뀐 순간에만 알림 이벤트를 돌려준다.
 * - 연속 실패가 기준(2회)에 닿으면 '장애' 한 번
 * - 장애 알림을 보낸 주소가 다시 응답하면 '복구' 한 번
 * 같은 확인 결과(확인 시각이 같은 캐시 결과)를 두 번 세지 않는다.
 */
export function createMonitorAlerter(
  failThreshold = ALERT_FAIL_THRESHOLD,
): MonitorAlerter {
  const states = new Map<string, MonitorState>();

  return {
    observe(observations) {
      const events: AlertEvent[] = [];
      const seen = new Set<string>();

      for (const { id, name, url, result } of observations) {
        // 주소를 바꾸면 새로 감시하는 것으로 본다.
        const key = `${id}:${url}`;
        seen.add(key);
        const state = states.get(key) ?? {
          lastCheckedAt: -1,
          failures: 0,
          downSince: 0,
          alerted: false,
        };
        states.set(key, state);
        if (result.checkedAt === state.lastCheckedAt) continue;
        state.lastCheckedAt = result.checkedAt;

        if (result.state === "down") {
          if (state.failures === 0) state.downSince = result.checkedAt;
          state.failures += 1;
          if (!state.alerted && state.failures >= failThreshold) {
            state.alerted = true;
            events.push({
              kind: "down",
              name,
              url,
              reason: result.reason ?? "응답 없음",
              checkedAt: result.checkedAt,
            });
          }
        } else {
          if (state.alerted) {
            events.push({
              kind: "recovered",
              name,
              url,
              responseMs: result.responseMs,
              downSince: state.downSince,
              checkedAt: result.checkedAt,
            });
          }
          state.failures = 0;
          state.alerted = false;
        }
      }

      // 삭제했거나 감시를 끈 주소는 잊는다.
      for (const key of states.keys()) {
        if (!seen.has(key)) states.delete(key);
      }
      return events;
    },
  };
}

function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `약 ${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `약 ${hours}시간` : `약 ${hours}시간 ${rest}분`;
}

function describe(event: AlertEvent): { label: string; detail: string } {
  if (event.kind === "down") {
    return {
      label: "장애",
      detail: `${event.reason} · ${formatDateTime(new Date(event.checkedAt))} 확인`,
    };
  }
  const response =
    event.responseMs === null ? "" : ` · 응답 ${event.responseMs}ms`;
  return {
    label: "복구",
    detail: `${formatDuration(event.checkedAt - event.downSince)} 동안 장애${response} · ${formatDateTime(new Date(event.checkedAt))} 확인`,
  };
}

/** 알림 메일 제목과 본문. 한 번 확인할 때 생긴 이벤트를 한 통에 모은다. */
export function buildAlertMail(events: AlertEvent[], siteUrl: string) {
  const down = events.filter((event) => event.kind === "down");
  const recovered = events.filter((event) => event.kind === "recovered");
  const parts = [
    down.length > 0 ? `장애 ${down.length}건` : "",
    recovered.length > 0 ? `복구 ${recovered.length}건` : "",
  ].filter(Boolean);
  const names = events.map((event) => event.name).join(", ");
  const subject = `[상태 감시] ${parts.join(" · ")}: ${names}`;
  const statusUrl = `${siteUrl}/status`;

  const text = [
    ...events.map((event) => {
      const { label, detail } = describe(event);
      return `[${label}] ${event.name} (${displayUrl(event.url)})\n  ${detail}`;
    }),
    "",
    `서비스 상태 페이지: ${statusUrl}`,
  ].join("\n");

  const rows = events
    .map((event) => {
      const { label, detail } = describe(event);
      const color = event.kind === "down" ? "#b42318" : "#067647";
      return `<li style="margin:0 0 12px"><strong style="color:${color}">${label}</strong> ${escapeHtml(event.name)} <span style="color:#566070">(${escapeHtml(displayUrl(event.url))})</span><br><span style="color:#566070;font-size:14px">${escapeHtml(detail)}</span></li>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="ko">
<body style="margin:0;padding:24px;background:#f7f8fa;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#141821;font-size:15px;line-height:1.7">
<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e1e5ec;border-radius:12px;padding:24px">
<p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#1f3fae">상태 감시 알림</p>
<ul style="margin:0;padding:0 0 0 18px">
${rows}
</ul>
<hr style="border:0;border-top:1px solid #e1e5ec;margin:16px 0">
<p style="margin:0;font-size:13px;color:#566070"><a href="${escapeHtml(statusUrl)}" style="color:#1f3fae">서비스 상태 페이지 보기</a></p>
</div>
</body>
</html>`;

  return { subject, text, html };
}
