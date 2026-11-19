import { rmSync, writeFileSync } from "node:fs";
import { expect, loginAsAdmin, test } from "./fixtures";

// 테스트 서버의 업로드 폴더(data/test/uploads) 옆. 서버의 백업 스크립트가 남기는 위치와 같은 규칙이다.
const BACKUP_STATUS = "data/test/backup-status.json";

test.describe("서버·배포 화면", () => {
  test.afterEach(() => rmSync(BACKUP_STATUS, { force: true }));

  test("배포·메모리·디스크·백업 정보가 보이고, 백업 기록 파일을 읽어 보여 준다", async ({ page }) => {
    rmSync(BACKUP_STATUS, { force: true });
    await loginAsAdmin(page);
    await page.goto("/admin/server");

    await expect(page.getByRole("heading", { level: 1, name: "서버·배포" })).toBeVisible();
    for (const title of ["배포", "메모리", "디스크·데이터", "백업"]) {
      await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
    }
    await expect(page.getByRole("meter", { name: "서버 전체 사용량" })).toBeVisible();
    await expect(page.getByText("백업 기록이 아직 없습니다.", { exact: false })).toBeVisible();

    const finishedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    writeFileSync(
      BACKUP_STATUS,
      JSON.stringify({ ok: true, finishedAt, label: "daily", bytes: 20480, totalBytes: 409600, fileCount: 8 }),
    );
    await page.getByRole("button", { name: "새로고침" }).click();
    await expect(page.getByText("정상", { exact: true })).toBeVisible();
    await expect(page.getByText("20.0 KB")).toBeVisible();
    await expect(page.getByText(/400 KB · 8개 파일/)).toBeVisible();

    writeFileSync(
      BACKUP_STATUS,
      JSON.stringify({ ok: false, finishedAt, label: "pre-deploy", bytes: 0, totalBytes: 409600, fileCount: 8 }),
    );
    await page.getByRole("button", { name: "새로고침" }).click();
    await expect(page.getByText("마지막 백업이 실패했습니다")).toBeVisible();
  });

  test("로그인하지 않으면 볼 수 없다", async ({ page }) => {
    await page.goto("/admin/server");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
