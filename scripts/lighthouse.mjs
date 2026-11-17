// Lighthouse 모바일 측정. 운영 빌드를 띄운 뒤 실행한다.
// 사용: node scripts/lighthouse.mjs [기준 주소=http://127.0.0.1:3100] [경로 ...]
// 결과: 점수와 90점 미만 항목을 출력하고, 보고서를 data/lighthouse/<이름>.json 에 저장한다.
// 성능·접근성·SEO 중 하나라도 90점 미만이면 종료 코드 1.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const base = args.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:3100";
const paths = args.filter((arg) => arg.startsWith("/"));
if (paths.length === 0) paths.push("/");

const REQUIRED = ["performance", "accessibility", "seo"];
mkdirSync("data/lighthouse", { recursive: true });
let failed = false;

for (const path of paths) {
  const name = path === "/" ? "home" : path.replace(/^\//, "").replaceAll("/", "-");
  const output = `data/lighthouse/${name}.json`;
  // 가끔 기록 수집에 실패(NO_NAVSTART)하므로 세 번까지 다시 시도한다.
  let run;
  for (let attempt = 1; attempt <= 3; attempt++) {
    run = spawnSync(
      "npx",
      [
        "lighthouse",
        base + path,
        "--quiet",
        '--chrome-flags="--headless=new"',
        "--only-categories=performance,accessibility,best-practices,seo",
        "--output=json",
        `--output-path=${output}`,
      ],
      // Playwright 가 내려받아 둔 Chromium 을 쓴다.
      {
        shell: true,
        stdio: ["ignore", "inherit", attempt < 3 ? "ignore" : "inherit"],
        env: { ...process.env, CHROME_PATH: chromium.executablePath() },
      },
    );
    if (run.status === 0) break;
  }
  if (run.status !== 0) {
    console.error(`${path}: 측정 실패`);
    failed = true;
    continue;
  }

  const report = JSON.parse(readFileSync(output, "utf8"));
  const scores = Object.entries(report.categories).map(
    ([key, category]) => [key, Math.round((category.score ?? 0) * 100)],
  );
  console.log(`${path}  ${scores.map(([key, score]) => `${key} ${score}`).join(" · ")}`);
  for (const metric of ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift"]) {
    console.log(`    ${metric}: ${report.audits[metric]?.displayValue}`);
  }
  for (const [key, category] of Object.entries(report.categories)) {
    for (const ref of category.auditRefs) {
      const audit = report.audits[ref.id];
      if (ref.weight > 0 && audit.score !== null && audit.score < 0.9) {
        console.log(`    미달 [${key}] ${ref.id}: ${audit.title} ${audit.displayValue ?? ""}`);
      }
    }
  }
  if (scores.some(([key, score]) => REQUIRED.includes(key) && score < 90)) failed = true;
}

process.exit(failed ? 1 : 0);
