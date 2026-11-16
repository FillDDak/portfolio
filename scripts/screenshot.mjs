// 개발 중 화면 확인용 스크린샷 도구.
// 사용: node scripts/screenshot.mjs <이름> [경로=/] [기준 주소=http://localhost:3000] [light|dark]
// 결과: data/screenshots/<이름>-<폭>[-full].png
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const [name = "home", path = "/", base = "http://localhost:3000", scheme = "light"] =
  process.argv.slice(2);

const viewports = [
  { label: "360", width: 360, height: 740, mobile: true },
  { label: "390", width: 390, height: 844, mobile: true },
  { label: "768", width: 768, height: 1024, mobile: false },
  { label: "1280", width: 1280, height: 800, mobile: false },
];

mkdirSync("data/screenshots", { recursive: true });
const browser = await chromium.launch();

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.mobile ? 2 : 1,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    colorScheme: scheme === "dark" ? "dark" : "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  const suffix = scheme === "dark" ? "-dark" : "";
  await page.screenshot({ path: `data/screenshots/${name}-${viewport.label}${suffix}.png` });
  await page.screenshot({
    path: `data/screenshots/${name}-${viewport.label}${suffix}-full.png`,
    fullPage: true,
  });
  console.log(
    `${name} ${viewport.label}px: 가로 넘침 ${overflow}px ${overflow > 0 ? "← 가로 스크롤 발생" : "(정상)"}`,
  );
  await context.close();
}

await browser.close();
