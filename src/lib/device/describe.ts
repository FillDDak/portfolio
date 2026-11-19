/**
 * User-Agent 와 브라우저가 따로 알려 준 값(ClientInfo)으로 브라우저·OS·기종을 정리한다.
 * 서버와 테스트에서 쓰는 순수 함수 모음.
 */

/** 브라우저에서 모아 보내는 값. 모두 선택이며, 받은 값은 parseClientInfo 로 검사한 뒤에만 쓴다. */
export type ClientInfo = {
  /** navigator.userAgentData 의 플랫폼 이름(Windows, macOS, Android …). 크롬 계열만 있다. */
  platform?: string;
  /** 실제 OS 버전. User-Agent 에는 고정값만 있어서 이 값으로 Windows 11, macOS 버전, Android 버전을 구분한다. */
  platformVersion?: string;
  /** 안드로이드 모델 코드(SM-S928N 등). 크롬 계열만 있다. */
  model?: string;
  /** 동시에 누를 수 있는 손가락 수. 데스크톱 모드 iPad 구분에 쓴다. */
  touch?: number;
  /** 화면 크기 "1920x1080" */
  screen?: string;
  /** 화면 배율 */
  dpr?: number;
  /** 시간대(Asia/Seoul) */
  tz?: string;
  /** 언어 목록 "ko-KR,en-US" */
  langs?: string;
  /** CPU 코어 수 */
  cores?: number;
  /** 메모리(GB, 대략값) */
  memory?: number;
};

const text = (value: unknown, max: number, pattern: RegExp): string | undefined =>
  typeof value === "string" && value.length > 0 && value.length <= max && pattern.test(value) ? value : undefined;

const number = (value: unknown, min: number, max: number): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : undefined;

/** 밖에서 받은 값에서 형식이 맞는 것만 남긴다. 아무것도 없으면 빈 객체. */
export function parseClientInfo(raw: unknown): ClientInfo {
  if (!raw || typeof raw !== "object") return {};
  const value = raw as Record<string, unknown>;
  const info: ClientInfo = {
    platform: text(value.platform, 30, /^[\w .-]+$/),
    platformVersion: text(value.platformVersion, 20, /^[\d.]+$/),
    model: text(value.model, 40, /^[\w .()+-]+$/),
    touch: number(value.touch, 0, 20),
    screen: text(value.screen, 11, /^\d{1,5}x\d{1,5}$/),
    dpr: number(value.dpr, 0.1, 10),
    tz: text(value.tz, 50, /^[\w/+-]+$/),
    langs: text(value.langs, 80, /^[\w,-]+$/),
    cores: number(value.cores, 1, 512),
    memory: number(value.memory, 0, 1024),
  };
  return Object.fromEntries(Object.entries(info).filter(([, item]) => item !== undefined)) as ClientInfo;
}

export type DeviceKind = "desktop" | "mobile" | "tablet";
export type DeviceSummary = { kind: DeviceKind; browser: string; os: string; model: string };

const major = (version: string | undefined) => version?.split(".")[0] ?? "";

function browserOf(ua: string): string {
  const version = (pattern: RegExp) => pattern.exec(ua)?.[1] ?? "";
  const named = (name: string, pattern?: RegExp) => {
    const found = pattern ? version(pattern) : "";
    return found ? `${name} ${found}` : name;
  };
  // 앱 안의 브라우저(인앱)가 먼저다. 이들은 바탕 브라우저(Chrome, Safari) 이름도 함께 달고 온다.
  if (/KAKAOTALK/i.test(ua)) return "카카오톡 인앱";
  if (/NAVER\(inapp/i.test(ua)) return "네이버 앱";
  if (/DaumApps/i.test(ua)) return "다음 앱";
  if (/Instagram/.test(ua)) return "인스타그램 인앱";
  if (/FBAN|FBAV/.test(ua)) return "페이스북 인앱";
  if (/ Line\//.test(ua)) return "라인 인앱";
  if (/Edg(?:A|iOS)?\//.test(ua)) return named("Edge", /Edg(?:A|iOS)?\/(\d+)/);
  if (/SamsungBrowser\//.test(ua)) return named("삼성 인터넷", /SamsungBrowser\/(\d+)/);
  if (/Whale\//.test(ua)) return named("Whale", /Whale\/(\d+)/);
  if (/OPR\/|OPiOS\//.test(ua)) return named("Opera", /(?:OPR|OPiOS)\/(\d+)/);
  if (/Firefox\/|FxiOS\//.test(ua)) return named("Firefox", /(?:Firefox|FxiOS)\/(\d+)/);
  if (/Chrome\/|CriOS\//.test(ua)) return named("Chrome", /(?:Chrome|CriOS)\/(\d+)/);
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return named("Safari", /Version\/(\d+(?:\.\d+)?)/);
  return "";
}

/** 브라우저·OS·기종을 정리한다. 모르는 칸은 빈 문자열. */
export function describeDevice(userAgent: string, info: ClientInfo = {}): DeviceSummary {
  const ua = userAgent;
  // 크롬 계열이 알려 준 값은 User-Agent 와 같은 OS 일 때만 믿는다(흉내 낸 User-Agent 와 섞이지 않게).
  const hinted = (platform: string) => (info.platform === platform ? info.platformVersion : undefined);

  let os = "";
  let model = "";
  let kind: DeviceKind = "desktop";

  if (/iPhone|iPod/.test(ua)) {
    const version = /OS (\d+)[_.](\d+)/.exec(ua);
    os = version ? `iOS ${version[1]}.${version[2]}` : "iOS";
    model = "iPhone";
    kind = "mobile";
  } else if (/iPad/.test(ua)) {
    const version = /OS (\d+)[_.](\d+)/.exec(ua);
    os = version ? `iPadOS ${version[1]}.${version[2]}` : "iPadOS";
    model = "iPad";
    kind = "tablet";
  } else if (/Android/.test(ua)) {
    // 요즘 크롬은 User-Agent 에 "Android 10; K" 같은 고정값만 넣는다. 그때는 따로 받은 값을 쓴다.
    const fromHint = major(hinted("Android"));
    const uaVersion = /Android (\d+(?:\.\d+)?)/.exec(ua)?.[1];
    const reduced = /Android 10; K\)/.test(ua);
    os = fromHint ? `Android ${fromHint}` : uaVersion && !reduced ? `Android ${uaVersion}` : "Android";
    const uaModel = /Android [\d.]+; ([^;)]+?)(?: Build\/[^;)]*)?(?:;|\))/.exec(ua)?.[1]?.trim() ?? "";
    model = info.platform === "Android" && info.model ? info.model : uaModel && uaModel !== "K" && uaModel !== "wv" ? uaModel : "";
    kind = /Mobile/.test(ua) ? "mobile" : "tablet";
  } else if (/Windows/.test(ua)) {
    const fromHint = hinted("Windows");
    const hintMajor = Number(major(fromHint));
    // Windows 11 은 platformVersion 13 이상, Windows 10 은 1~10. User-Agent 만으로는 둘을 구분할 수 없다.
    os = fromHint === undefined ? "Windows" : hintMajor >= 13 ? "Windows 11" : hintMajor >= 1 ? "Windows 10" : "Windows";
  } else if (/Macintosh|Mac OS X/.test(ua)) {
    if ((info.touch ?? 0) > 1) {
      // 데스크톱 모드의 iPad 는 Mac 처럼 보이지만 터치를 지원한다.
      os = "iPadOS";
      model = "iPad";
      kind = "tablet";
    } else {
      const fromHint = major(hinted("macOS"));
      os = fromHint ? `macOS ${fromHint}` : "macOS";
    }
  } else if (/CrOS/.test(ua)) {
    os = "ChromeOS";
  } else if (/Linux/.test(ua)) {
    os = "Linux";
  }

  if (kind === "desktop" && /Mobi/i.test(ua)) kind = "mobile";
  return { kind, browser: browserOf(ua), os, model };
}

export const DEVICE_KIND_LABEL: Record<string, string> = { desktop: "PC", mobile: "모바일", tablet: "태블릿" };

/** "Chrome 142 · Windows 11" 처럼 한 줄로. 아무것도 모르면 대신할 말을 준다. */
export function deviceLine(summary: Pick<DeviceSummary, "browser" | "os" | "model">, fallback = "알 수 없음"): string {
  const parts = [summary.browser, summary.os, summary.model].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : fallback;
}
