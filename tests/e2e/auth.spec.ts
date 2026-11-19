import { ADMIN, expect, login, loginAsAdmin, test } from "./fixtures";

test.describe("관리자 로그인", () => {
  test("로그인하지 않으면 관리자 화면과 관리자 API 에 들어갈 수 없다", async ({ page, request }) => {
    await page.goto("/admin/projects");
    await expect(page).toHaveURL(/\/admin\/login$/);

    const api = await request.get("/api/admin/realtime");
    expect(api.status()).toBe(401);
    expect((await request.get("/api/admin/messages/summary")).status()).toBe(401);
  });

  test("로그인하면 대시보드가 보이고, 로그아웃하면 다시 막힌다", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 로그인한 상태로 로그인 화면에 가면 대시보드로 돌아온다.
    await page.goto("/admin/login");
    await expect(page).toHaveURL(/\/admin$/);

    const cookies = await page.context().cookies();
    const session = cookies.find((cookie) => cookie.name.includes("admin_session"));
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");

    await page.getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("틀리면 남은 횟수를 알려주고, 5번 틀리면 맞는 비밀번호도 막는다", async ({ page }) => {
    await login(page, { username: ADMIN.username, password: "wrong-password" });
    await expect(page.getByText("아이디 또는 비밀번호가 올바르지 않습니다. (남은 시도 4회)")).toBeVisible();

    // 아이디가 틀려도 같은 문구가 나온다(무엇이 틀렸는지 알려주지 않는다).
    await login(page, { username: "nobody", password: ADMIN.password });
    await expect(page.getByText("아이디 또는 비밀번호가 올바르지 않습니다. (남은 시도 3회)")).toBeVisible();

    for (let count = 0; count < 3; count++) {
      await login(page, { username: ADMIN.username, password: `wrong-${count}` });
      await expect(page.getByRole("alert").filter({ hasText: /남은 시도|다시 시도/ })).toBeVisible();
    }
    await expect(page.getByText(/남은 시도/)).toBeHidden();

    // 잠긴 뒤에는 맞는 비밀번호로도 들어갈 수 없다.
    await login(page);
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("alert").filter({ hasText: /다시 시도/ })).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
