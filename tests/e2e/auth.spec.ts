import { ADMIN, expect, ipFor, login, loginAsAdmin, test } from "./fixtures";

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

test.describe("로그인 기록", () => {
  test("실패와 성공이 IP·기기와 함께 남고, 실패만 따로 볼 수 있다", async ({ page }, testInfo) => {
    const ip = ipFor(testInfo);
    await login(page, { username: ADMIN.username, password: "wrong-password" });
    await expect(page.getByText(/남은 시도 4회/)).toBeVisible();
    await loginAsAdmin(page);

    await page.goto("/admin/logins");
    // 기록은 로그인 응답을 보낸 뒤에 저장되므로, 보일 때까지 새로고침해 본다.
    const rowsForIp = () => page.locator("tr, li").filter({ hasText: ip }).filter({ visible: true });
    await expect(async () => {
      await page.reload();
      await expect(rowsForIp()).toHaveCount(2);
    }).toPass({ timeout: 10_000 });

    await expect(rowsForIp().nth(0)).toContainText("성공");
    await expect(rowsForIp().nth(1)).toContainText("실패");
    // 테스트 IP(10.x)는 내부 주소라 외부에 위치를 묻지 않는다.
    await expect(rowsForIp().nth(0)).toContainText("내부 주소");
    await expect(rowsForIp().nth(0)).toContainText("지금 접속한 IP");
    await expect(rowsForIp().nth(0)).toContainText(/Chrome \d+/);
    // 브라우저에서 받은 정보로 같은 기기를 묶는 ID 가 붙고, 펼치면 화면·시간대 등이 보인다.
    const deviceIds = await rowsForIp().getByText(/기기 ID/).allInnerTexts();
    expect(deviceIds).toHaveLength(2);
    expect(deviceIds[0]).toMatch(/기기 ID [0-9A-F]{4}-[0-9A-F]{4}/);
    expect(deviceIds[1]).toBe(deviceIds[0]);
    await rowsForIp().nth(0).getByText("자세히").click();
    await expect(rowsForIp().nth(0)).toContainText(/화면\s*\d+x\d+/);
    await expect(rowsForIp().nth(0)).toContainText("시간대");

    await page.getByRole("link", { name: "실패·잠김만" }).click();
    await expect(page).toHaveURL(/filter=failed/);
    await expect(rowsForIp()).toHaveCount(1);
    await expect(rowsForIp().first()).toContainText("실패");
  });
});
