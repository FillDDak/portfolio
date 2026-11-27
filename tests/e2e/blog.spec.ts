import { expect, loginAsAdmin, test } from "./fixtures";

test.describe("블로그", () => {
  test("블로그는 상단 메뉴가 아니라 첫 화면·푸터의 프로필 링크에서 같은 탭으로 연다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "Blog" })).toHaveCount(0);

    const footerLink = page.locator("footer").getByRole("link", { name: "Blog", exact: true });
    await expect(footerLink).toHaveAttribute("href", "/blog");
    await expect(footerLink).not.toHaveAttribute("target", /.*/);

    await page.locator("#about").getByRole("link", { name: "Blog" }).click();
    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("블로그");
  });

  test("목록형·카드형을 바꿔 볼 수 있고, 고른 방식은 다시 들어와도 유지된다. 본문 첫 이미지가 썸네일이 된다", async ({ page }) => {
    await page.goto("/blog");
    const listButton = page.getByRole("button", { name: "목록형" });
    const cardButton = page.getByRole("button", { name: "카드형" });
    await expect(listButton).toHaveAttribute("aria-pressed", "true");

    // 목록형: 이미지가 있는 글 2개만 썸네일이 있다.
    const items = page.locator("main article");
    await expect(items).toHaveCount(4);
    await expect(page.locator("main article img")).toHaveCount(2);
    await expect(items.filter({ hasText: "선착순 쿠폰 초과 발급" }).locator("img")).toHaveAttribute(
      "src",
      "/uploads/5eed0000000000000000000000000001.webp",
    );

    await cardButton.click();
    await expect(cardButton).toHaveAttribute("aria-pressed", "true");
    // 카드형: 모든 글에 썸네일 자리가 있고, 이미지가 없는 글은 빈 칸으로 채운다.
    await expect(page.locator("main article img")).toHaveCount(2);
    await expect(page.locator("main ul.grid > li")).toHaveCount(4);
    // 업로드 폴더의 이미지가 실제로 열린다.
    const firstImage = page.locator("main article img").first();
    await firstImage.scrollIntoViewIfNeeded();
    await expect.poll(() => firstImage.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    await page.reload();
    await expect(page.getByRole("button", { name: "카드형" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("main ul.grid > li")).toHaveCount(4);

    await page.getByRole("button", { name: "목록형" }).click();
    await expect(page.locator("main ul.grid")).toHaveCount(0);
  });

  test("분류 버튼으로 트러블슈팅·개발 노트만 골라 볼 수 있다", async ({ page }) => {
    await page.goto("/blog");
    const filters = page.getByRole("group", { name: "분류" });
    const titles = page.locator("main article h2");
    await expect(filters.getByRole("button", { name: "전체 4" })).toHaveAttribute("aria-pressed", "true");

    await filters.getByRole("button", { name: "트러블슈팅 3" }).click();
    await expect(titles).toHaveText([
      "[예시] 쿠폰 발급 API 응답 지연",
      "[예시] 선착순 쿠폰 초과 발급 문제",
      "[예시] 게시글 목록 N+1 문제",
    ]);

    // 카드형으로 바꿔도 고른 분류는 그대로다.
    await page.getByRole("button", { name: "카드형" }).click();
    await expect(titles).toHaveCount(3);

    await filters.getByRole("button", { name: "개발 노트 1" }).click();
    await expect(titles).toHaveText(["[예시] Spring 트랜잭션 전파 정리"]);

    await filters.getByRole("button", { name: "전체 4" }).click();
    await expect(titles).toHaveCount(4);
  });

  test("글 목록은 공개한 글만 최신순으로 보이고, 글에서 관련 프로젝트로 이어진다", async ({ page }) => {
    await page.goto("/blog");
    const titles = page.locator("main article h2");
    await expect(titles).toHaveText([
      "[예시] Spring 트랜잭션 전파 정리",
      "[예시] 쿠폰 발급 API 응답 지연",
      "[예시] 선착순 쿠폰 초과 발급 문제",
      "[예시] 게시글 목록 N+1 문제",
    ]);
    await expect(page.locator("main")).not.toContainText("작성 중인 글");

    await page.getByRole("link", { name: "[예시] 선착순 쿠폰 초과 발급 문제" }).click();
    await expect(page).toHaveURL(/\/blog\/example-coupon-over-issue$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("[예시] 선착순 쿠폰 초과 발급 문제");
    // 앞 화면(목록)도 숨긴 채로 남아 있으므로 제목(h1)이 있는 글만 본다.
    const article = page.locator("article").filter({ has: page.getByRole("heading", { level: 1 }) });
    await expect(article).toContainText("트러블슈팅");
    await expect(article).toContainText("2026.04.10");

    await page.getByRole("link", { name: /관련 프로젝트/ }).click();
    await expect(page).toHaveURL(/\/projects\/example-coupon$/);
  });

  test("프로젝트 상세에 연결한 트러블슈팅이 날짜 순서로 보인다", async ({ page }) => {
    await page.goto("/projects/example-coupon");
    const section = page.locator("section").filter({ has: page.locator("#posts-heading") });
    await expect(section.locator("h2")).toHaveText("트러블슈팅");
    await expect(section.locator("h3")).toHaveText([
      "[예시] 선착순 쿠폰 초과 발급 문제",
      "[예시] 쿠폰 발급 API 응답 지연",
    ]);
  });

  test("비공개 글과 없는 글 주소는 404", async ({ page }) => {
    for (const path of ["/blog/example-draft", "/blog/no-such-post"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
    await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
  });

  test("관리자에서 프로젝트에 연결한 글을 쓰면 공개 페이지에 보이고, 지우면 사라진다", async ({ page }, testInfo) => {
    const title = `E2E 트러블슈팅 ${testInfo.project.name}`;
    const slug = `e2e-troubleshooting-${testInfo.project.name}`;
    await loginAsAdmin(page);

    // 프로젝트 수정 화면의 '이 프로젝트의 글 쓰기'로 들어가면 프로젝트가 미리 골라져 있다.
    await page.goto("/admin/projects");
    await page
      .getByRole("listitem")
      .filter({ hasText: "[예시] 스터디 모집 게시판" })
      .getByRole("link", { name: "수정" })
      .click();
    await page.getByRole("link", { name: "이 프로젝트의 글 쓰기" }).click();
    await expect(page.locator("#post-projectId option:checked")).toHaveText("[예시] 스터디 모집 게시판");
    await expect(page.locator("#post-category")).toHaveValue("TROUBLESHOOTING");
    await expect(page.locator("#post-body")).toHaveValue(/## 원인/);

    await page.locator("#post-title").fill(title);
    await page.locator("#post-slug").fill(slug);
    await page.locator("#post-summary").fill("E2E 요약");
    await page.locator("#post-date").fill("2026-01-05");
    // 앞에서 본 프로젝트 수정 화면이 숨긴 채로 남아 있으므로 글 폼 안에서만 찾는다.
    const form = page.locator("form").filter({ has: page.locator("#post-title") });
    await form.getByLabel(/^공개/).check();
    await form.getByRole("button", { name: "저장" }).click();
    await expect(page).toHaveURL(/\/admin\/blog\/\d+$/);

    try {
      await page.goto(`/blog/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      // 트러블슈팅 본문 뼈대의 소제목이 그대로 들어가 있다.
      await expect(page.locator("article h2", { hasText: "원인" })).toBeVisible();

      await page.goto("/projects/example-study-board");
      await expect(page.locator("section").filter({ has: page.locator("#posts-heading") })).toContainText(title);
    } finally {
      await page.goto("/admin/blog");
      const item = page.getByRole("listitem").filter({ hasText: title });
      await item.getByRole("button", { name: "삭제" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
      await expect(page.getByRole("listitem").filter({ hasText: title })).toHaveCount(0);
    }
    const response = await page.goto(`/blog/${slug}`);
    expect(response?.status()).toBe(404);
  });
});
