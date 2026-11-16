import { describe, expect, it } from "vitest";
import { buildContactMail, escapeHtml } from "@/lib/mail/contact-mail";

describe("escapeHtml", () => {
  it("HTML 특수 문자를 모두 바꾼다", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });
});

describe("buildContactMail", () => {
  const input = {
    name: "홍길동 <b>",
    email: "hong@example.com",
    organization: "",
    subject: "면접 제안",
    body: "첫 줄\n<script>alert(1)</script>",
  };

  it("제목 앞에 [포트폴리오 문의] 를 붙인다", () => {
    expect(buildContactMail(input).subject).toBe("[포트폴리오 문의] 면접 제안");
  });

  it("본문에 이름, 소속, 메일 주소, 내용을 정리해 넣는다", () => {
    const { text } = buildContactMail(input);
    expect(text).toContain("이름: 홍길동 <b>");
    expect(text).toContain("소속: (입력하지 않음)");
    expect(text).toContain("메일 주소: hong@example.com");
    expect(text).toContain("첫 줄\n<script>alert(1)</script>");
  });

  it("HTML 본문에서는 방문자가 입력한 값을 이스케이프한다", () => {
    const { html } = buildContactMail(input);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("홍길동 <b>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("홍길동 &lt;b&gt;");
  });
});
