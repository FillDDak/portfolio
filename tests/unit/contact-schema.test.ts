import { describe, expect, it } from "vitest";
import { contactSchema, toFieldErrors } from "@/lib/validation/contact";

const valid = {
  name: "홍길동",
  email: "hong@example.com",
  organization: "예시 회사",
  subject: "면접 제안드립니다",
  body: "안녕하세요. 포트폴리오 잘 봤습니다.",
};

describe("contactSchema", () => {
  it("올바른 입력을 통과시키고 앞뒤 공백을 지운다", () => {
    const result = contactSchema.parse({ ...valid, name: "  홍길동  ", email: " hong@example.com " });
    expect(result.name).toBe("홍길동");
    expect(result.email).toBe("hong@example.com");
    expect(result.website).toBe("");
  });

  it("소속은 비워도 된다", () => {
    const { organization: _omit, ...rest } = valid;
    void _omit;
    expect(contactSchema.parse(rest).organization).toBe("");
  });

  it("필수 값이 비면 필드별 메시지를 돌려준다", () => {
    const result = contactSchema.safeParse({ name: " ", email: "", subject: "", body: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = toFieldErrors(result.error);
    expect(errors.name).toBe("이름 또는 소속을 입력해 주세요.");
    expect(errors.email).toBe("메일 주소를 입력해 주세요.");
    expect(errors.subject).toBe("제목을 입력해 주세요.");
    expect(errors.body).toMatch(/10자 이상/);
  });

  it("메일 주소 형식을 검사한다", () => {
    for (const email of ["abc", "a@b", "a b@example.com", "@example.com"]) {
      expect(contactSchema.safeParse({ ...valid, email }).success, email).toBe(false);
    }
  });

  it("본문 길이를 제한한다", () => {
    expect(contactSchema.safeParse({ ...valid, body: "짧다" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, body: "가".repeat(5000) }).success).toBe(true);
    expect(contactSchema.safeParse({ ...valid, body: "가".repeat(5001) }).success).toBe(false);
  });

  it("제목과 이름의 줄바꿈을 거부한다 (메일 헤더 주입 방지)", () => {
    expect(contactSchema.safeParse({ ...valid, subject: "hi\r\nBcc: x@evil.com" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, name: "a\nb" }).success).toBe(false);
  });

  it("본문의 줄바꿈은 허용한다", () => {
    expect(contactSchema.safeParse({ ...valid, body: "첫 줄입니다.\n둘째 줄입니다." }).success).toBe(true);
  });

  it("허니팟 값은 검증을 통과시키되 그대로 전달한다 (서버가 봇으로 처리)", () => {
    expect(contactSchema.parse({ ...valid, website: "http://spam.example" }).website).toBe(
      "http://spam.example",
    );
  });
});
