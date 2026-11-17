import type { Page } from "@playwright/test";
import { expect, findMails, test } from "./fixtures";

async function fillContact(page: Page, values: { subject: string; body?: string }) {
  await page.locator("#contact-name").fill("김채용");
  await page.locator("#contact-email").fill("recruiter@example.com");
  await page.locator("#contact-organization").fill("예시 주식회사");
  await page.locator("#contact-subject").fill(values.subject);
  await page.locator("#contact-body").fill(values.body ?? "포트폴리오 잘 봤습니다. 면접 일정을 잡고 싶습니다.");
}

test.describe("문의 메일", () => {
  test("폼을 보내면 메일이 발송되고 완료 화면이 보인다", async ({ page }, testInfo) => {
    const token = `E2E-${testInfo.project.name}-${Date.now()}`;
    await page.goto("/#contact");
    await fillContact(page, { subject: `면접 제안 ${token}`, body: "첫 줄입니다.\n<b>굵게</b> 는 그대로 보여야 합니다." });
    await page.getByRole("button", { name: "보내기" }).click();

    await expect(page.getByText("문의가 전달되었습니다.")).toBeVisible();

    await expect.poll(() => findMails(token).length).toBe(1);
    const [mail] = findMails(token);
    expect(mail?.subject).toBe(`[포트폴리오 문의] 면접 제안 ${token}`);
    expect(mail?.envelopeTo).toEqual(["inbox@example.com"]);
    expect(mail?.replyTo).toContain("recruiter@example.com");
    expect(mail?.text).toContain("김채용");
    expect(mail?.text).toContain("예시 주식회사");
    // 방문자가 쓴 태그는 HTML 메일에서 글자 그대로 보이게 바뀌어야 한다.
    expect(mail?.html).toContain("&lt;b&gt;굵게&lt;/b&gt;");
    expect(mail?.html).not.toContain("<b>굵게</b>");

    // 받는 사람 주소는 화면 어디에도 나오지 않는다.
    expect(await page.content()).not.toContain("inbox@example.com");

    await page.getByRole("button", { name: "새 문의 작성" }).click();
    await expect(page.locator("#contact-subject")).toHaveValue("");
  });

  test("빈 칸과 잘못된 메일 주소는 보내지 않고 칸마다 오류를 보여준다", async ({ page }, testInfo) => {
    const token = `E2E-invalid-${testInfo.project.name}-${Date.now()}`;
    await page.goto("/#contact");
    await page.locator("#contact-email").fill("메일아님");
    await page.locator("#contact-subject").fill(token);
    await page.locator("#contact-body").fill("짧음");
    await page.getByRole("button", { name: "보내기" }).click();

    await expect(page.getByText("입력한 내용을 다시 확인해 주세요.")).toBeVisible();
    // 첫 번째 오류 칸(이름)으로 포커스가 간다.
    await expect(page.locator("#contact-name")).toBeFocused();
    await expect(page.locator("#contact-name")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#contact-email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#contact-body")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("문의가 전달되었습니다.")).toBeHidden();
    expect(findMails(token)).toHaveLength(0);
  });

  test("같은 방문자가 10분 안에 네 번째로 보내면 막는다", async ({ page }, testInfo) => {
    const token = `E2E-limit-${testInfo.project.name}-${Date.now()}`;
    await page.goto("/#contact");
    for (let count = 1; count <= 3; count++) {
      await fillContact(page, { subject: `${token} ${count}번째` });
      await page.getByRole("button", { name: "보내기" }).click();
      await expect(page.getByText("문의가 전달되었습니다.")).toBeVisible();
      await page.getByRole("button", { name: "새 문의 작성" }).click();
    }

    await fillContact(page, { subject: `${token} 4번째` });
    await page.getByRole("button", { name: "보내기" }).click();
    await expect(page.getByText(/짧은 시간에 여러 번 보내셨습니다/)).toBeVisible();
    // 입력한 내용은 지워지지 않는다.
    await expect(page.locator("#contact-subject")).toHaveValue(`${token} 4번째`);

    await expect.poll(() => findMails(token).length).toBe(3);
  });
});
