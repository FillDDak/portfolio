import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ADMIN, expect, loginAsAdmin, test } from "./fixtures";

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

test.describe("백업 내려받기", () => {
  test("비밀번호를 다시 확인하고, DB 사본과 업로드 폴더가 든 파일을 내려준다", async ({ page }, testInfo) => {
    await loginAsAdmin(page);
    await page.goto("/admin/server");
    const password = page.getByLabel("관리자 비밀번호 확인");

    await password.fill("wrong-password");
    await page.getByRole("button", { name: "내려받기" }).click();
    await expect(page.getByText(/비밀번호가 올바르지 않습니다. \(남은 시도 4회\)/)).toBeVisible();

    await password.fill(ADMIN.password);
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "내려받기" }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(/^portfolio-backup-\d{8}-\d{4}\.tar\.gz$/);
    await expect(page.getByText(/을\(를\) 내려받았습니다/)).toBeVisible();
    await expect(password).toHaveValue("");

    const dir = testInfo.outputPath("backup");
    mkdirSync(dir, { recursive: true });
    await download.saveAs(join(dir, "backup.tar.gz"));
    const listing = execFileSync("tar", ["-tzf", "backup.tar.gz"], { cwd: dir, encoding: "utf8" });
    expect(listing).toContain("portfolio.db");
    expect(listing).toMatch(/^uploads\/?$/m);

    execFileSync("tar", ["-xzf", "backup.tar.gz", "portfolio.db"], { cwd: dir });
    // SQLite 파일은 이 16바이트로 시작한다.
    expect(readFileSync(join(dir, "portfolio.db")).subarray(0, 16).toString()).toBe("SQLite format 3\0");
  });

  test("로그인하지 않으면 내려받을 수 없다", async ({ request }) => {
    const response = await request.post("/api/admin/backup", { data: { password: ADMIN.password } });
    expect(response.status()).toBe(401);
  });
});
