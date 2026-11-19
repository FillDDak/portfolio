import { expect, loginAsAdmin, test } from "./fixtures";

test.describe("기술 아이콘", () => {
  test("공개 화면의 기술 이름 앞에 단색 로고가 붙고, 로고가 없는 이름은 글자만 보인다", async ({ page }) => {
    await page.goto("/");

    // 프로젝트 카드의 스택 태그
    const tags = page.getByRole("list", { name: "사용 스택" }).first().getByRole("listitem");
    const java = tags.filter({ hasText: /^Java$/ });
    await expect(java.locator("svg")).toHaveCount(1);
    await expect(java.locator("svg")).toHaveAttribute("aria-hidden", "true");
    // 글자색을 따라가는 단색 아이콘이다.
    await expect(java.locator("svg")).toHaveAttribute("fill", "currentColor");
    await expect(tags.filter({ hasText: /^Spring Boot$/ }).locator("svg")).toHaveCount(1);

    // 아이콘은 글자 높이에 맞춰 이름 앞에 있다.
    const iconBox = (await java.locator("svg").boundingBox())!;
    const chipBox = (await java.boundingBox())!;
    expect(iconBox.height).toBeLessThan(chipBox.height);
    expect(iconBox.x).toBeLessThan(chipBox.x + 16);

    // 첫 화면 핵심 스택: Java 는 아이콘이 붙고, 로고가 없는 JPA 는 글자만 보인다.
    const coreStack = page.locator("#about li");
    await expect(coreStack.filter({ hasText: /^Java$/ }).locator("svg")).toHaveCount(1);
    const jpa = coreStack.filter({ hasText: /^JPA$/ });
    await expect(jpa).toBeVisible();
    await expect(jpa.locator("svg")).toHaveCount(0);
  });

  test("관리자 입력칸 아래에 붙을 아이콘을 미리 보여 준다", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/profile");
    const input = page.locator("#coreStack");
    const original = await input.inputValue();
    const hint = page.getByTestId("tech-icon-hint-coreStack");

    await input.fill("Kotlin, JPA, Docker");
    await expect(hint).toContainText("Kotlin");
    const kotlin = hint.locator("span").filter({ hasText: /^Kotlin$/ });
    await expect(kotlin.locator("svg")).toHaveCount(1);
    await expect(hint.locator("span").filter({ hasText: /^JPA/ })).toContainText("(아이콘 없음)");
    await expect(hint.locator("span").filter({ hasText: /^Docker$/ }).locator("svg")).toHaveCount(1);

    // 저장하지 않았으므로 원래 값은 그대로다.
    await page.reload();
    await expect(page.locator("#coreStack")).toHaveValue(original);
  });
});
