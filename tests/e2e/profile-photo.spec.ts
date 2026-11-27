import sharp from "sharp";
import type { Page } from "@playwright/test";
import { expect, loginAsAdmin, test } from "./fixtures";

/** 왼쪽 절반은 빨강, 오른쪽 절반은 파랑인 가로로 긴 테스트용 사진. 서버가 정사각형으로 잘라야 한다. */
async function wideImage() {
  const red = await sharp({ create: { width: 600, height: 800, channels: 3, background: "#d02020" } })
    .png()
    .toBuffer();
  return sharp({ create: { width: 1200, height: 800, channels: 3, background: "#2040d0" } })
    .composite([{ input: red, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

/** 홈 첫 화면 사진의 가운데 색이 빨강인지 파랑인지 */
async function homePhotoColor(page: Page, alt: string) {
  await page.goto("/");
  const src = await page.getByRole("img", { name: alt }).getAttribute("src");
  const body = await (await page.request.get(src!)).body();
  const { data } = await sharp(body).extract({ left: 360, top: 480, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  return data[0] > data[2] ? "red" : "blue";
}

test.describe("프로필 사진", () => {
  test("관리자에서 올린 사진이 첫 화면에 PC 는 3:4, 모바일은 동그랗게 보이고, 지우면 사라진다", async ({ page }, testInfo) => {
    await loginAsAdmin(page);
    await page.goto("/admin/profile");
    const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: "프로필 사진" }) });
    const fileInput = panel.locator('input[type="file"]');
    const uploadStatus = panel.getByTestId("photo-upload-status");

    // 이미지가 아닌 파일은 거절한다.
    await fileInput.setInputFiles({ name: "note.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
    await expect(uploadStatus).toContainText("jpg, png, webp");

    await fileInput.setInputFiles({ name: "me.png", mimeType: "image/png", buffer: await wideImage() });
    await expect(uploadStatus).toContainText(/사진을 올렸습니다|교체했습니다/);
    await expect(panel.getByTestId("photo-position-editor")).toBeVisible();

    try {
      await page.goto("/");
      const name = (await page.locator("#hero-heading").innerText()).trim();
      // 모바일용과 PC용 중 화면에 맞는 하나만 보인다.
      const photo = page.getByRole("img", { name: `${name} 프로필 사진` });
      await expect(photo).toHaveCount(1);
      await expect(photo).toBeVisible();
      // 서버에서 720×960px(3:4)으로 잘랐다.
      expect(await photo.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([720, 960]);

      const photoBox = (await photo.boundingBox())!;
      const headingBox = (await page.locator("#hero-heading").boundingBox())!;
      if (testInfo.project.name === "mobile") {
        expect(Math.round(photoBox.width)).toBe(Math.round(photoBox.height));
        // 모바일: 이름 옆 작은 사진이고, 첫 화면에서 문의 버튼이 밀려나지 않는다.
        expect(photoBox.width).toBeLessThanOrEqual(96);
        expect(photoBox.x + photoBox.width).toBeLessThanOrEqual(headingBox.x);
        const contact = page.locator("#about").getByRole("link", { name: "문의하기" });
        const contactBox = (await contact.boundingBox())!;
        expect(contactBox.y + contactBox.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      } else {
        // PC: 글 오른쪽에 3:4 로 크게 보인다.
        expect(Math.round((photoBox.width / photoBox.height) * 100)).toBe(75);
        expect(photoBox.height).toBeGreaterThanOrEqual(300);
        expect(photoBox.x).toBeGreaterThan(headingBox.x + headingBox.width);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true);

      // 보이는 부분 바꾸기: 사진을 오른쪽 끝까지 끌면 왼쪽(빨강)이, 왼쪽 끝까지 끌면 오른쪽(파랑)이 보인다.
      const alt = `${name} 프로필 사진`;
      for (const [dx, expected] of [
        [400, "red"],
        [-400, "blue"],
      ] as const) {
        await page.goto("/admin/profile");
        const editor = panel.getByTestId("photo-position-editor");
        const box = (await editor.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2, { steps: 8 });
        await page.mouse.up();
        // 처음 위치가 이미 그쪽 끝이면 바뀐 것이 없어 저장 버튼이 꺼져 있다.
        const save = panel.getByRole("button", { name: "위치 저장" });
        if (await save.isEnabled()) {
          await save.click();
          await expect(panel.getByText("보이는 부분을 저장했습니다.")).toBeVisible();
        }
        expect(await homePhotoColor(page, alt)).toBe(expected);
      }

      // 확대 배율도 저장되고, 다시 열면 그대로 남아 있다.
      await page.goto("/admin/profile");
      await panel.getByLabel(/확대/).fill("2");
      await panel.getByRole("button", { name: "위치 저장" }).click();
      await expect(panel.getByText("보이는 부분을 저장했습니다.")).toBeVisible();
      await page.reload();
      await expect(panel.getByLabel(/확대/)).toHaveValue("2");
      await expect(panel.getByRole("button", { name: "위치 저장" })).toBeDisabled();    } finally {
      await page.goto("/admin/profile");
      await panel.getByRole("button", { name: "삭제" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
      await expect(panel.getByText("사진 없음")).toBeVisible();
    }

    await page.goto("/");
    await expect(page.locator("#about img")).toHaveCount(0);
  });
});
