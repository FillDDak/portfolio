import { describe, expect, it, vi } from "vitest";
import { describeUserAgent, formatLocation, isPrivateIp, parseIpApiResponse } from "@/lib/login-history/parse";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

const { lookupGeo } = await import("@/lib/login-history");

describe("로그인 기록: 위치 조회 대상", () => {
  it.each(["10.1.2.3", "127.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.0.10", "169.254.1.1", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fd12:3456::1", "::ffff:10.0.0.1", "unknown", ""])(
    "%s 는 내부·잘못된 주소라 조회하지 않는다",
    (ip) => expect(isPrivateIp(ip)).toBe(true),
  );

  it.each(["211.234.1.1", "8.8.8.8", "172.32.0.1", "100.128.0.1", "2001:4860:4860::8888", "::ffff:8.8.8.8"])(
    "%s 는 공인 주소라 조회한다",
    (ip) => expect(isPrivateIp(ip)).toBe(false),
  );
});

describe("로그인 기록: 위치 응답 해석", () => {
  it("성공 응답에서 국가·지역·도시·통신사를 꺼낸다", () => {
    expect(
      parseIpApiResponse({ status: "success", country: "South Korea", regionName: "Seoul", city: "Seoul", isp: "Korea Telecom" }),
    ).toEqual({ country: "South Korea", region: "Seoul", city: "Seoul", isp: "Korea Telecom" });
  });

  it("실패 응답이나 형식이 틀린 값은 null", () => {
    expect(parseIpApiResponse({ status: "fail", message: "private range" })).toBeNull();
    expect(parseIpApiResponse("oops")).toBeNull();
    expect(parseIpApiResponse({ status: "success" })).toBeNull();
  });

  it("겹치는 이름은 한 번만 쓴다", () => {
    expect(formatLocation({ city: "Seoul", region: "Seoul", country: "South Korea" })).toBe("Seoul, South Korea");
    expect(formatLocation({ city: "Bundang-gu", region: "Gyeonggi-do", country: "South Korea" })).toBe(
      "Bundang-gu, Gyeonggi-do, South Korea",
    );
  });

  it("IP 하나만 보내고, 응답이 없거나 오류면 null", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ status: "success", country: "Japan", regionName: "Tokyo", city: "Tokyo", isp: "NTT" }),
    );
    expect(await lookupGeo("203.0.113.5", fetchImpl as unknown as typeof fetch)).toEqual({
      country: "Japan",
      region: "Tokyo",
      city: "Tokyo",
      isp: "NTT",
    });
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(
      "http://ip-api.com/json/203.0.113.5?fields=status,country,regionName,city,isp",
    );

    const failing = vi.fn(async () => {
      throw new Error("timeout");
    });
    expect(await lookupGeo("203.0.113.5", failing as unknown as typeof fetch)).toBeNull();
    const limited = vi.fn(async () => new Response(null, { status: 429 }));
    expect(await lookupGeo("203.0.113.5", limited as unknown as typeof fetch)).toBeNull();
  });
});

describe("로그인 기록: 기기 표시", () => {
  it.each([
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36", "Chrome · Windows"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 Edg/131.0", "Edge · Windows"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", "Safari · iOS"],
    ["Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36", "삼성 인터넷 · Android"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15", "Safari · macOS"],
    ["curl/8.5.0", "알 수 없음"],
    ["", "정보 없음"],
  ])("%s → %s", (ua, expected) => expect(describeUserAgent(ua)).toBe(expected));
});
