import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/request-ip";

const headers = (forwarded?: string) =>
  new Headers(forwarded === undefined ? {} : { "x-forwarded-for": forwarded });

describe("getClientIp", () => {
  it("프록시가 없으면(0) 헤더를 믿지 않는다", () => {
    expect(getClientIp(headers("1.2.3.4"), 0)).toBe("unknown");
  });

  it("프록시가 하나면 마지막 값을 쓴다", () => {
    expect(getClientIp(headers("203.0.113.7"), 1)).toBe("203.0.113.7");
  });

  it("방문자가 앞에 끼워 넣은 가짜 값은 무시한다", () => {
    expect(getClientIp(headers("9.9.9.9, 203.0.113.7"), 1)).toBe("203.0.113.7");
  });

  it("프록시가 둘이면 뒤에서 두 번째 값을 쓴다", () => {
    expect(getClientIp(headers("9.9.9.9, 203.0.113.7, 172.16.0.1"), 2)).toBe("203.0.113.7");
  });

  it("값이 프록시 수보다 적으면 알 수 없음으로 처리한다", () => {
    expect(getClientIp(headers("203.0.113.7"), 2)).toBe("unknown");
    expect(getClientIp(headers(), 1)).toBe("unknown");
  });

  it("포트와 IPv6 표기를 정리한다", () => {
    expect(getClientIp(headers("203.0.113.7:51234"), 1)).toBe("203.0.113.7");
    expect(getClientIp(headers("[2001:DB8::1]:443"), 1)).toBe("2001:db8::1");
    expect(getClientIp(headers("2001:DB8::1"), 1)).toBe("2001:db8::1");
  });

  it("IP 로 볼 수 없는 값은 믿지 않는다", () => {
    expect(getClientIp(headers("<script>"), 1)).toBe("unknown");
  });
});
