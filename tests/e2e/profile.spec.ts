import { expect, loginAsAdmin, test } from "./fixtures";

test.describe("자기소개", () => {
  test("관리자에서 넣은 줄바꿈이 첫 화면 소개 글에서도 줄바꿈으로 보인다", async ({ page }, testInfo) => {
    const first = `첫 번째 문장입니다 ${testInfo.project.name}.`;
    const second = "두 번째 문장은 다음 줄에 보입니다.";

    await loginAsAdmin(page);
    await page.goto("/admin/profile");
    const bio = page.locator("#bio");
    const original = await bio.inputValue();

    try {
      await bio.fill(`${first}\n${second}`);
      await page.getByRole("button", { name: "저장", exact: true }).click();
      await expect(page.getByRole("status").filter({ hasText: /저장/ })).toBeVisible();

      await page.goto("/");
      const paragraph = page.locator("#hero-heading ~ p").filter({ hasText: first });
      // 화면에 보이는 글자(innerText)에 줄바꿈이 남아 있고, 실제로 두 줄 높이로 그려진다.
      await expect.poll(() => paragraph.innerText()).toBe(`${first}\n${second}`);
      const lineHeight = await paragraph.evaluate((element) => parseFloat(getComputedStyle(element).lineHeight));
      expect((await paragraph.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(lineHeight * 2 - 1);
    } finally {
      await page.goto("/admin/profile");
      await page.locator("#bio").fill(original);
      await page.getByRole("button", { name: "저장", exact: true }).click();
      await expect(page.getByRole("status").filter({ hasText: /저장/ })).toBeVisible();
    }
  });
});
