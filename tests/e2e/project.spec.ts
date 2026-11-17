import { expect, loginAsAdmin, newVisitor, test } from "./fixtures";

// PC 와 모바일 테스트가 서로 다른 프로젝트를 고쳐서 결과가 섞이지 않게 한다.
const TARGET = {
  pc: { slug: "example-study-board", title: "[예시] 스터디 모집 게시판" },
  mobile: { slug: "example-ledger", title: "[예시] 개인 가계부 API" },
} as const;

test.describe("프로젝트 수정", () => {
  test("관리자에서 고친 내용이 공개 페이지에 바로 반영된다", async ({ page, browser }, testInfo) => {
    const target = TARGET[testInfo.project.name as keyof typeof TARGET];
    const summary = `E2E 수정 ${testInfo.project.name} ${Date.now()}`;

    // 방문자가 고치기 전 페이지를 먼저 본다(캐시된 페이지가 갱신되는지 확인하기 위해).
    const visitor = await (await newVisitor(browser, testInfo, "visitor")).newPage();
    await visitor.goto(`/projects/${target.slug}`);
    await expect(visitor.getByRole("heading", { level: 1, name: target.title })).toBeVisible();
    await expect(visitor.getByText(summary)).toBeHidden();

    await loginAsAdmin(page);
    await page.goto("/admin/projects");
    await page
      .locator("div")
      .filter({ hasText: `/projects/${target.slug}` })
      .filter({ has: page.getByRole("link", { name: "수정" }) })
      .last()
      .getByRole("link", { name: "수정" })
      .click();
    await expect(page.locator("#title")).toHaveValue(target.title);

    await page.locator("#summary").fill(summary);
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: /저장/ })).toBeVisible();

    // 상세 페이지와 홈의 카드 모두 새 내용으로 바뀐다.
    await visitor.goto(`/projects/${target.slug}`);
    await expect(visitor.getByText(summary)).toBeVisible();
    await visitor.goto("/");
    await expect(visitor.getByText(summary)).toBeVisible();
    await visitor.context().close();
  });

  test("비공개로 바꾸면 공개 페이지에서 사라지고 주소는 404 가 된다", async ({ page, browser }, testInfo) => {
    const target = TARGET[testInfo.project.name as keyof typeof TARGET];
    const visitor = await (await newVisitor(browser, testInfo, "visitor")).newPage();

    await loginAsAdmin(page);
    await page.goto("/admin/projects");
    const row = page
      .locator("div")
      .filter({ hasText: `/projects/${target.slug}` })
      .filter({ has: page.getByRole("link", { name: "수정" }) })
      .last();
    await row.getByRole("link", { name: "수정" }).click();
    const published = page.getByLabel(/공개/).first();
    await expect(published).toBeChecked();
    await published.uncheck();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: /저장/ })).toBeVisible();

    const hidden = await visitor.goto(`/projects/${target.slug}`);
    expect(hidden?.status()).toBe(404);
    await expect(visitor.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
    await visitor.goto("/");
    await expect(visitor.getByText(target.title)).toBeHidden();
    const sitemap = await visitor.request.get("/sitemap.xml");
    expect(await sitemap.text()).not.toContain(`/projects/${target.slug}`);

    // 다시 공개로 돌려놓는다.
    await published.check();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect
      .poll(async () => (await visitor.request.get(`/projects/${target.slug}`)).status())
      .toBe(200);
    await visitor.context().close();
  });
});
