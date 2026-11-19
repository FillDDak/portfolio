import { describe, expect, it } from "vitest";
import { describeDevice, deviceLine, parseClientInfo } from "@/lib/device/describe";
import { deviceIdOf, readClientInfo } from "@/lib/login-history/parse";

const WIN_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const ANDROID_REDUCED =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36";
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";

describe("기기 정리", () => {
  it.each([
    [WIN_CHROME, "Chrome 142 · Windows"],
    [`${WIN_CHROME} Edg/142.0.0.0`, "Edge 142 · Windows"],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
      "Safari 18.6 · iOS 18.6 · iPhone",
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36",
      "삼성 인터넷 26 · Android 14 · SM-S918N",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 25.9.0",
      "카카오톡 인앱 · iOS 18.6 · iPhone",
    ],
    [ANDROID_REDUCED, "Chrome 142 · Android"],
    [MAC_SAFARI, "Safari 26.0 · macOS"],
  ])("%s → %s", (ua, expected) => expect(deviceLine(describeDevice(ua))).toBe(expected));

  it("크롬 계열이 따로 알려 준 값으로 Windows 11, 실제 Android 버전과 모델을 안다", () => {
    expect(describeDevice(WIN_CHROME, { platform: "Windows", platformVersion: "19.0.0" }).os).toBe("Windows 11");
    expect(describeDevice(WIN_CHROME, { platform: "Windows", platformVersion: "10.0.0" }).os).toBe("Windows 10");
    const phone = describeDevice(ANDROID_REDUCED, { platform: "Android", platformVersion: "16.0.0", model: "SM-S928N" });
    expect(phone).toEqual({ kind: "mobile", browser: "Chrome 142", os: "Android 16", model: "SM-S928N" });
  });

  it("User-Agent 와 OS 가 다른 값은 쓰지 않는다", () => {
    const summary = describeDevice(ANDROID_REDUCED, { platform: "Windows", platformVersion: "19.0.0", model: "X" });
    expect(summary.os).toBe("Android");
    expect(summary.model).toBe("");
  });

  it("터치가 되는 Mac 은 데스크톱 모드 iPad 로 본다", () => {
    expect(describeDevice(MAC_SAFARI, { touch: 5 })).toMatchObject({ kind: "tablet", os: "iPadOS", model: "iPad" });
    expect(describeDevice(MAC_SAFARI, { touch: 0 }).kind).toBe("desktop");
  });

  it("모르는 User-Agent 는 빈 칸", () => {
    expect(deviceLine(describeDevice("curl/8.5.0"))).toBe("알 수 없음");
  });
});

describe("기기 정보 검사", () => {
  it("형식이 맞는 값만 남긴다", () => {
    expect(
      parseClientInfo({
        platform: "Windows",
        platformVersion: "19.0.0",
        screen: "1920x1080",
        tz: "Asia/Seoul",
        cores: 8,
        model: "<script>",
        dpr: Infinity,
        langs: "x".repeat(200),
        extra: "무시",
      }),
    ).toEqual({ platform: "Windows", platformVersion: "19.0.0", screen: "1920x1080", tz: "Asia/Seoul", cores: 8 });
    expect(parseClientInfo(null)).toEqual({});
    expect(readClientInfo("깨진 JSON")).toEqual({});
  });
});

describe("기기 ID", () => {
  const info = { screen: "1920x1080", dpr: 1, tz: "Asia/Seoul", langs: "ko-KR", cores: 8, memory: 8, touch: 0 };

  it("같은 기기는 브라우저가 업데이트돼도 같은 값이다", () => {
    const id = deviceIdOf(WIN_CHROME, info);
    expect(id).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(deviceIdOf(WIN_CHROME.replace("142", "143"), info)).toBe(id);
  });

  it("화면이나 시간대가 다르면 다른 값이다", () => {
    const id = deviceIdOf(WIN_CHROME, info);
    expect(deviceIdOf(WIN_CHROME, { ...info, screen: "2560x1440" })).not.toBe(id);
    expect(deviceIdOf(WIN_CHROME, { ...info, tz: "America/New_York" })).not.toBe(id);
  });

  it("브라우저에서 받은 값이 없으면 빈 문자열", () => {
    expect(deviceIdOf(WIN_CHROME, {})).toBe("");
  });
});
