import type { Page } from "@playwright/test";
import { expect, loginAsAdmin, newVisitor, test } from "./fixtures";

const PROJECT_PATH = "/projects/example-coupon";

/** 페이지를 열고, 그 페이지의 조회 신호가 서버에 도착할 때까지 기다린다. */
async function visit(page: Page, path: string) {
  const tracked = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/track") &&
      (response.request().postData() ?? "").includes('"type":"view"'),
  );
  await page.goto(path);
  expect((await tracked).status()).toBe(204);
}

/** 관리자 조회 기록 화면에 표시되는 전체 건수 */
async function viewCount(admin: Page): Promise<number> {
  await admin.goto("/admin/views");
  // 메뉴의 '읽지 않은 문의 N건' 배지와 섞이지 않게 본문 안에서만 찾는다.
  const text = await admin.locator("main").getByText(/[\d,]+건/).first().innerText();
  return Number(text.match(/([\d,]+)건/)?.[1]?.replaceAll(",", ""));
}

test.describe("조회수 기록", () => {
  test("방문은 한 번만 세고, 봇과 로그인한 관리자는 세지 않는다", async ({ page, browser }, testInfo) => {
    const admin = await (await newVisitor(browser, testInfo, "admin")).newPage();
    await loginAsAdmin(admin);
    const before = await viewCount(admin);

    // 1. 일반 방문자의 첫 방문은 1건으로 기록된다.
    await visit(page, PROJECT_PATH);
    await expect.poll(() => viewCount(admin)).toBe(before + 1);

    // 2. 같은 방문자가 같은 페이지를 다시 봐도 늘지 않는다(30분 안 중복 제거).
    await visit(page, PROJECT_PATH);
    expect(await viewCount(admin)).toBe(before + 1);

    // 3. 같은 방문자가 다른 페이지를 보면 따로 센다.
    await visit(page, "/");
    await expect.poll(() => viewCount(admin)).toBe(before + 2);

    // 4. 검색 로봇은 세지 않는다.
    const bot = await newVisitor(browser, testInfo, "bot", {
      userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    });
    await visit(await bot.newPage(), PROJECT_PATH);
    expect(await viewCount(admin)).toBe(before + 2);
    await bot.close();

    // 5. 로그인한 관리자가 공개 페이지를 봐도 세지 않는다.
    await visit(admin, PROJECT_PATH);
    expect(await viewCount(admin)).toBe(before + 2);

    // 6. 다른 방문자(다른 IP)는 새로 센다.
    const other = await newVisitor(browser, testInfo, "other");
    await visit(await other.newPage(), PROJECT_PATH);
    await expect.poll(() => viewCount(admin)).toBe(before + 3);
    await other.close();

    // 조회 기록에는 페이지와 기기 종류가 남고, 공개 페이지에는 조회수가 보이지 않는다.
    await admin.goto("/admin/views");
    // 모바일 화면에서는 표 대신 카드로 보이므로, 화면에 실제로 보이는 것 중에서 찾는다.
    const device = testInfo.project.name === "mobile" ? "모바일" : "PC";
    await expect(admin.getByText(device).filter({ visible: true }).first()).toBeVisible();
    await page.goto(PROJECT_PATH);
    await expect(page.getByText(/조회\s*\d|조회수/)).toHaveCount(0);
    await admin.context().close();
  });

  test("없는 페이지와 관리자 화면 경로는 기록하지 않는다", async ({ page, browser, request }, testInfo) => {
    const admin = await (await newVisitor(browser, testInfo, "admin")).newPage();
    await loginAsAdmin(admin);
    const before = await viewCount(admin);

    for (const path of ["/admin", "/projects/does-not-exist", "/api/contact", "https://example.com/"]) {
      const response = await request.post("/api/track", {
        data: { type: "view", path, referrer: "", utmSource: "" },
        headers: { "user-agent": await page.evaluate(() => navigator.userAgent) },
      });
      // 기록 여부와 상관없이 항상 같은 응답을 준다.
      expect(response.status()).toBe(204);
    }
    expect(await viewCount(admin)).toBe(before);
    await admin.context().close();
  });
});

test.describe("대시보드 새로고침 버튼", () => {
  test("누르면 페이지를 다시 열지 않고 최신 조회수로 바뀐다", async ({ page, browser }, testInfo) => {
    const admin = await (await newVisitor(browser, testInfo, "admin")).newPage();
    await loginAsAdmin(admin);
    const today = admin.locator("main").getByText("오늘 조회").locator("xpath=..").locator("p").nth(1);
    const before = Number((await today.innerText()).replace(/\D/g, ""));

    // 화면을 다시 열면 남지 않는 표시를 붙여 두고, 버튼을 누른 뒤에도 남아 있는지 본다.
    await admin.evaluate(() => document.body.setAttribute("data-kept", "1"));
    await visit(page, PROJECT_PATH);
    expect(Number((await today.innerText()).replace(/\D/g, ""))).toBe(before);

    await admin.getByRole("button", { name: "새로고침" }).click();
    await expect(today).toContainText(String(before + 1));
    await expect(admin.locator("body")).toHaveAttribute("data-kept", "1");
    await admin.context().close();
  });
});
