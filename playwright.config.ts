import { defineConfig, devices } from "@playwright/test";

/**
 * E2E 테스트. 운영 빌드를 테스트 전용 설정으로 띄워서 실제 브라우저로 확인한다.
 * 실행: npm run build 후 npm run test:e2e
 *
 * - 서버: scripts/start-test-server.mjs (새 DB + 더미 데이터, 관리자 admin / test-password-1234)
 * - 메일: scripts/dev-smtp.mjs 가 받아서 data/test-mailbox 에 파일로 저장한다(실제로 보내지 않음)
 * - 요청 제한과 조회수 중복 제거가 메모리에 쌓이므로 테스트는 한 번에 하나씩 실행한다.
 */
const PORT = 3100;
export const MAILBOX_DIR = "data/test-mailbox";

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "pc", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: `node scripts/dev-smtp.mjs 2525 ${MAILBOX_DIR}`,
      wait: { stdout: /대기 중/ },
      reuseExistingServer: false,
    },
    {
      command: `node scripts/start-test-server.mjs ${PORT} --seed`,
      url: `http://127.0.0.1:${PORT}/robots.txt`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
