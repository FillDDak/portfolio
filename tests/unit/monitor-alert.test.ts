import { describe, expect, it } from "vitest";
import {
  buildAlertMail,
  createMonitorAlerter,
  type MonitorObservation,
} from "@/lib/status/alert";

const MINUTE = 60_000;

function observe(
  id: number,
  state: "up" | "down",
  checkedAt: number,
  url = "https://a.example.com",
): MonitorObservation {
  return {
    id,
    name: `서비스${id}`,
    url,
    result: {
      state,
      checkedAt,
      responseMs: state === "up" ? 120 : null,
      reason: state === "down" ? "연결할 수 없음" : null,
    },
  };
}

describe("상태 감시 알림", () => {
  it("정상이면 알림이 없다", () => {
    const alerter = createMonitorAlerter();
    expect(alerter.observe([observe(1, "up", 1)])).toEqual([]);
    expect(alerter.observe([observe(1, "up", 2)])).toEqual([]);
  });

  it("한 번 실패로는 알리지 않고, 두 번 연속 실패하면 장애를 한 번만 알린다", () => {
    const alerter = createMonitorAlerter();
    expect(alerter.observe([observe(1, "down", 1)])).toEqual([]);
    const events = alerter.observe([observe(1, "down", 2)]);
    expect(events).toEqual([
      {
        kind: "down",
        name: "서비스1",
        url: "https://a.example.com",
        reason: "연결할 수 없음",
        checkedAt: 2,
      },
    ]);
    expect(alerter.observe([observe(1, "down", 3)])).toEqual([]);
  });

  it("한 번 실패 후 바로 회복하면 아무 알림도 없다", () => {
    const alerter = createMonitorAlerter();
    alerter.observe([observe(1, "down", 1)]);
    expect(alerter.observe([observe(1, "up", 2)])).toEqual([]);
    expect(alerter.observe([observe(1, "down", 3)])).toEqual([]);
  });

  it("장애를 알린 주소가 다시 응답하면 복구를 알리고 장애 시작 시각을 함께 준다", () => {
    const alerter = createMonitorAlerter();
    alerter.observe([observe(1, "down", 0)]);
    alerter.observe([observe(1, "down", MINUTE)]);
    const events = alerter.observe([observe(1, "up", 5 * MINUTE)]);
    expect(events).toEqual([
      {
        kind: "recovered",
        name: "서비스1",
        url: "https://a.example.com",
        responseMs: 120,
        downSince: 0,
        checkedAt: 5 * MINUTE,
      },
    ]);
    expect(alerter.observe([observe(1, "up", 6 * MINUTE)])).toEqual([]);
  });

  it("확인 시각이 같은 결과(캐시)는 두 번 세지 않는다", () => {
    const alerter = createMonitorAlerter();
    alerter.observe([observe(1, "down", 1)]);
    expect(alerter.observe([observe(1, "down", 1)])).toEqual([]);
    expect(alerter.observe([observe(1, "down", 2)])).toHaveLength(1);
  });

  it("주소를 바꾸거나 감시에서 빼면 상태를 새로 시작한다", () => {
    const alerter = createMonitorAlerter();
    alerter.observe([observe(1, "down", 1)]);
    expect(
      alerter.observe([observe(1, "down", 2, "https://b.example.com")]),
    ).toEqual([]);

    alerter.observe([observe(2, "down", 3)]);
    alerter.observe([]);
    expect(alerter.observe([observe(2, "down", 4)])).toEqual([]);
  });

  it("주소마다 따로 판단한다", () => {
    const alerter = createMonitorAlerter();
    alerter.observe([observe(1, "down", 1), observe(2, "up", 1)]);
    const events = alerter.observe([
      observe(1, "down", 2),
      observe(2, "down", 2),
    ]);
    expect(events.map((event) => [event.kind, event.name])).toEqual([
      ["down", "서비스1"],
    ]);
  });

  it("메일 제목에 건수와 이름이 들어가고, 이름은 HTML 에서 이스케이프된다", () => {
    const mail = buildAlertMail(
      [
        {
          kind: "down",
          name: "<API>",
          url: "https://a.example.com",
          reason: "HTTP 503 응답",
          checkedAt: 0,
        },
        {
          kind: "recovered",
          name: "블로그",
          url: "https://b.example.com",
          responseMs: 80,
          downSince: 0,
          checkedAt: 90 * MINUTE,
        },
      ],
      "https://fillddak.kr",
    );
    expect(mail.subject).toBe("[상태 감시] 장애 1건 · 복구 1건: <API>, 블로그");
    expect(mail.text).toContain("[장애] <API>");
    expect(mail.text).toContain("약 1시간 30분 동안 장애");
    expect(mail.text).toContain("https://fillddak.kr/status");
    expect(mail.html).toContain("&lt;API&gt;");
    expect(mail.html).not.toContain("<API>");
  });
});
