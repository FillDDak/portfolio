import { describe, expect, it } from "vitest";
import {
  buildContactEnvelope,
  buildContactMail,
  escapeHtml,
  resolveFromAddress,
} from "@/lib/mail/contact-mail";

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

describe("resolveFromAddress", () => {
  it("SMTP_FROM 이 있으면 그 주소를 쓴다 (발송 서비스: 로그인 아이디가 메일 주소가 아님)", () => {
    expect(resolveFromAddress({ SMTP_FROM: "contact@fillddak.kr", SMTP_USER: "resend" })).toBe(
      "contact@fillddak.kr",
    );
  });

  it("SMTP_FROM 이 없으면 SMTP_USER 를 쓴다 (네이버 SMTP)", () => {
    expect(resolveFromAddress({ SMTP_USER: "someone@naver.com" })).toBe("someone@naver.com");
  });

  it("메일 주소로 쓸 수 없으면 null 을 돌려준다", () => {
    expect(resolveFromAddress({ SMTP_USER: "resend" })).toBeNull();
    expect(resolveFromAddress({})).toBeNull();
  });
});

describe("buildContactEnvelope", () => {
  it("방문자 주소는 회신 주소에만 넣고 보낸 사람에는 쓰지 않는다", () => {
    const envelope = buildContactEnvelope(
      { name: "홍길동", email: "hong@example.com", organization: "", subject: "제목", body: "내용" },
      { from: "contact@fillddak.kr", to: "me@example.com" },
    );
    expect(envelope.from.address).toBe("contact@fillddak.kr");
    expect(envelope.to).toBe("me@example.com");
    expect(envelope.replyTo).toEqual({ name: "홍길동", address: "hong@example.com" });
  });
});
