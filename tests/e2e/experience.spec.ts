import { expect, loginAsAdmin, test } from "./fixtures";

test.describe("경험", () => {
  test("홈에서 프로젝트 다음에 종류와 상관없이 최근순으로 보이고, 관련 프로젝트로 이어진다", async ({ page }) => {
    await page.goto("/");
    const ids = await page.locator("main section[id]").evaluateAll((sections) => sections.map((section) => section.id));
    expect(ids.indexOf("experience")).toBe(ids.indexOf("projects") + 1);

    const section = page.locator("#experience");
    // 진행 중 → 끝난 달(수상은 받은 달)이 최근인 순서
    await expect(section.locator("dt")).toHaveText(["활동", "학력", "교육", "수상"]);
    await expect(section).toContainText("2025.03 – 2025.09");
    await expect(section).toContainText("진행 중");
    // 수상은 받은 달 하나만 보인다.
    await expect(section.locator("dd").filter({ hasText: "해커톤 우수상" })).toContainText(/2025\.08$/);

    const link = section.getByRole("link", { name: /관련 프로젝트:/ });
    await expect(link).toHaveAttribute("href", "/projects/example-coupon");
    await link.click();
    await expect(page).toHaveURL(/\/projects\/example-coupon$/);
  });

  test("관리자에서 추가하면 홈에 보이고, 지우면 사라진다", async ({ page }, testInfo) => {
    const title = `E2E 수상 ${testInfo.project.name}`;
    await loginAsAdmin(page);
    await page.goto("/admin/experiences");
    const form = page.locator("form").filter({ has: page.locator("#new-experience-title") });
    await form.locator("#new-experience-kind").selectOption("AWARD");
    await form.locator("#new-experience-title").fill(title);
    await form.locator("#new-experience-start").fill("2024-11");
    // 수상에 종료 월을 넣어도 저장하지 않는다.
    await form.locator("#new-experience-end").fill("2025-01");
    await form.getByRole("button", { name: "추가" }).click();
    await expect(page.locator(`input[value="${title}"]`)).toBeAttached();

    try {
      await page.goto("/");
      const rows = page.locator("#experience dd");
      await expect(rows.filter({ hasText: title })).toContainText(/2024\.11$/);
      // 가장 오래된 것이라 맨 아래다(예시 데이터의 2025.08 수상 다음).
      await expect(rows.last()).toContainText(title);
    } finally {
      await page.goto("/admin/experiences");
      const panel = page.locator("section").filter({ has: page.locator(`input[value="${title}"]`) });
      await panel.getByRole("button", { name: "삭제" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
      await expect(page.locator(`input[value="${title}"]`)).toHaveCount(0);
    }
    await page.goto("/");
    await expect(page.locator("#experience")).not.toContainText(title);
  });
});
