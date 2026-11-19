import sharp from "sharp";
import { expect, loginAsAdmin, test } from "./fixtures";

/** 가로로 긴 테스트용 사진. 서버가 정사각형으로 잘라야 한다. */
async function wideImage() {
  return sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 90, g: 120, b: 160 } } })
    .png()
    .toBuffer();
}

test.describe("프로필 사진", () => {
  test("관리자에서 올린 사진이 첫 화면에 정사각형으로 보이고, 지우면 사라진다", async ({ page }, testInfo) => {
    await loginAsAdmin(page);
    await page.goto("/admin/profile");
    const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: "프로필 사진" }) });
    const fileInput = panel.locator('input[type="file"]');

    // 이미지가 아닌 파일은 거절한다.
    await fileInput.setInputFiles({ name: "note.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
    await expect(panel.getByRole("alert")).toContainText("jpg, png, webp");

    await fileInput.setInputFiles({ name: "me.png", mimeType: "image/png", buffer: await wideImage() });
    await expect(panel.getByRole("status")).toContainText(/사진을 올렸습니다|교체했습니다/);
    await expect(panel.getByRole("img", { name: "현재 프로필 사진" })).toBeVisible();

    try {
      await page.goto("/");
      const name = (await page.locator("#hero-heading").innerText()).trim();
      // 모바일용과 PC용 중 화면에 맞는 하나만 보인다.
      const photo = page.getByRole("img", { name: `${name} 프로필 사진` });
      await expect(photo).toHaveCount(1);
      await expect(photo).toBeVisible();
      // 서버에서 800px 정사각형으로 잘랐다.
      expect(await photo.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([800, 800]);

      const photoBox = (await photo.boundingBox())!;
      const headingBox = (await page.locator("#hero-heading").boundingBox())!;
      expect(Math.round(photoBox.width)).toBe(Math.round(photoBox.height));
      if (testInfo.project.name === "mobile") {
        // 모바일: 이름 옆 작은 사진이고, 첫 화면에서 문의 버튼이 밀려나지 않는다.
        expect(photoBox.width).toBeLessThanOrEqual(96);
        expect(photoBox.x + photoBox.width).toBeLessThanOrEqual(headingBox.x);
        const contact = page.locator("#about").getByRole("link", { name: "문의하기" });
        const contactBox = (await contact.boundingBox())!;
        expect(contactBox.y + contactBox.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      } else {
        // PC: 글 오른쪽에 크게 보인다.
        expect(photoBox.width).toBeGreaterThanOrEqual(200);
        expect(photoBox.x).toBeGreaterThan(headingBox.x + headingBox.width);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true);
    } finally {
      await page.goto("/admin/profile");
      await panel.getByRole("button", { name: "삭제" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
      await expect(panel.getByText("사진 없음")).toBeVisible();
    }

    await page.goto("/");
    await expect(page.locator("#about img")).toHaveCount(0);
  });
});
