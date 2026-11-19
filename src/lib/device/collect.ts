import type { ClientInfo } from "./describe";

type HighEntropy = { platform?: string; platformVersion?: string; model?: string };
type UserAgentData = { getHighEntropyValues?: (hints: string[]) => Promise<HighEntropy> };

const HINT_TIMEOUT_MS = 500;

/**
 * 브라우저에서 기기 정보를 모은다. 권한 창은 뜨지 않으며, 실패한 값은 빼고 돌려준다.
 * extended 가 false 면 OS·기종을 구분하는 데 필요한 값만 모은다.
 */
export async function collectClientInfo(extended = false): Promise<ClientInfo> {
  const info: ClientInfo = {};
  try {
    info.touch = navigator.maxTouchPoints;
    const data = (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData;
    if (data?.getHighEntropyValues) {
      const hints = await Promise.race([
        data.getHighEntropyValues(["platformVersion", "model"]),
        new Promise<HighEntropy>((resolve) => setTimeout(() => resolve({}), HINT_TIMEOUT_MS)),
      ]);
      if (hints.platform) info.platform = hints.platform;
      if (hints.platformVersion) info.platformVersion = hints.platformVersion;
      if (hints.model) info.model = hints.model;
    }
    if (extended) {
      info.screen = `${screen.width}x${screen.height}`;
      info.dpr = Math.round(window.devicePixelRatio * 100) / 100;
      info.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      info.langs = navigator.languages.slice(0, 5).join(",");
      info.cores = navigator.hardwareConcurrency;
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      if (typeof memory === "number") info.memory = memory;
    }
  } catch {
    // 모으지 못한 값은 빼고 보낸다.
  }
  return info;
}
