import { expect, loginAsAdmin, test } from "./fixtures";

test.describe("서비스 상태 페이지", () => {
  test("관리자에서 넣은 설명이 이름 아래 보이고, 감시 주소는 공개 페이지에 나오지 않는다", async ({ page, baseURL }, testInfo) => {
    const name = `E2E 서비스 ${testInfo.project.name}`;
    const description = "포트폴리오 사이트의 검색 로봇 안내 파일";
    // 테스트 서버 자기 자신을 감시한다. 이 주소는 공개 페이지에 나오면 안 된다.
    const url = `${baseURL}/robots.txt?e2e=${testInfo.project.name}`;

    await loginAsAdmin(page);
    await page.goto("/admin/monitors");
    const form = page.locator("form").filter({ has: page.locator("#new-monitor-name") });
    await form.locator("#new-monitor-name").fill(name);
    await form.locator("#new-monitor-url").fill(url);
    await form.locator("#new-monitor-description").fill(description);
    await form.getByRole("button", { name: "추가" }).click();
    await expect(page.locator('input[name="name"]').and(page.locator(`[value="${name}"]`))).toBeAttached();

    try {
      await page.goto("/status");
      const item = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name }) });
      await expect(item).toContainText(description);
      await expect(item.getByText("정상")).toBeVisible();
      await expect(item).toContainText(/응답 시간 \d/);
      expect(await page.content()).not.toContain(`e2e=${testInfo.project.name}`);
      // 모바일에서도 가로로 넘치지 않는다.
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true);
    } finally {
      await page.goto("/admin/monitors");
      const panel = page.locator("section").filter({ has: page.locator(`input[value="${name}"]`) });
      await panel.getByRole("button", { name: "삭제" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
      await expect(page.locator(`input[value="${name}"]`)).toHaveCount(0);
    }
  });
});
