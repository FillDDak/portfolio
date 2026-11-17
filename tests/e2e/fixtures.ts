import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test as base, expect, type Browser, type Page, type TestInfo } from "@playwright/test";
import { MAILBOX_DIR } from "../../playwright.config";

export const ADMIN = { username: "admin", password: "test-password-1234" };

/**
 * 테스트 서버는 X-Forwarded-For 의 마지막 값을 방문자 IP 로 본다(TRUSTED_PROXY_HOPS=1).
 * 요청 제한, 로그인 잠금, 조회수 중복 제거가 IP 기준이라서 테스트마다 다른 IP 를 쓴다.
 */
export function ipFor(testInfo: TestInfo, label = ""): string {
  const digest = createHash("sha256")
    .update(`${testInfo.project.name}|${testInfo.titlePath.join("|")}|${testInfo.retry}|${label}`)
    .digest();
  return `10.${digest[0]}.${digest[1]}.${(digest[2] ?? 0) % 254 + 1}`;
}

export const test = base.extend({
  extraHTTPHeaders: async ({}, provide, testInfo) => {
    await provide({ "x-forwarded-for": ipFor(testInfo) });
  },
});

export { expect };

export async function login(page: Page, credentials = ADMIN) {
  await page.goto("/admin/login");
  await page.getByLabel("아이디").fill(credentials.username);
  await page.getByLabel("비밀번호").fill(credentials.password);
  await page.getByRole("button", { name: "로그인" }).click();
}

export async function loginAsAdmin(page: Page) {
  await login(page);
  await expect(page).toHaveURL(/\/admin$/);
}

/** 현재 테스트와 같은 기기 설정에 다른 IP(필요하면 다른 User-Agent)를 쓰는 새 방문자 */
export async function newVisitor(
  browser: Browser,
  testInfo: TestInfo,
  label: string,
  options: { userAgent?: string } = {},
) {
  const { defaultBrowserType: _ignored, ...device } = testInfo.project.use as Record<string, unknown>;
  void _ignored;
  return browser.newContext({
    ...device,
    ...(options.userAgent ? { userAgent: options.userAgent } : {}),
    extraHTTPHeaders: { "x-forwarded-for": ipFor(testInfo, label) },
  });
}

export type SavedMail = {
  envelopeFrom: string | null;
  envelopeTo: string[];
  from: string | null;
  to: string | null;
  replyTo: string | null;
  subject: string | null;
  text: string | null;
  html: string | null;
};

/** 가짜 SMTP 서버가 받은 메일 중 제목에 token 이 들어 있는 것 */
export function findMails(token: string): SavedMail[] {
  let files: string[];
  try {
    files = readdirSync(MAILBOX_DIR);
  } catch {
    return [];
  }
  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(join(MAILBOX_DIR, file), "utf8")) as SavedMail)
    .filter((mail) => mail.subject?.includes(token));
}
