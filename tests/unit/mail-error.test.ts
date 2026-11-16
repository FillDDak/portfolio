import { describe, expect, it } from "vitest";
import { describeMailError } from "@/lib/mail/contact-mail";

describe("describeMailError", () => {
  it("로그인 거부(535)를 분류하고 확인할 설정을 알려준다", () => {
    const info = describeMailError(
      Object.assign(new Error("Invalid login: 535 5.7.1 Username and Password not accepted"), {
        code: "EAUTH",
        responseCode: 535,
        command: "AUTH PLAIN",
      }),
    );
    expect(info.code).toBe("EAUTH");
    expect(info.responseCode).toBe(535);
    expect(info.command).toBe("AUTH PLAIN");
    expect(info.hint).toContain("IMAP/SMTP 사용함");
    expect(info.hint).toContain("애플리케이션 비밀번호");
  });

  it("연결 실패와 시간 초과를 구분한다", () => {
    expect(
      describeMailError(Object.assign(new Error("connect ECONNREFUSED"), { code: "ESOCKET" })).hint,
    ).toContain("연결하지 못했습니다");
    expect(
      describeMailError(Object.assign(new Error("Connection timeout"), { code: "ETIMEDOUT" })).hint,
    ).toContain("시간 안에");
  });

  it("알 수 없는 오류도 메시지는 그대로 남긴다", () => {
    const info = describeMailError(new Error("이상한 오류"));
    expect(info.code).toBe("UNKNOWN");
    expect(info.message).toBe("이상한 오류");
  });

  it("Error 가 아닌 값이 던져져도 처리한다", () => {
    expect(describeMailError("문자열 오류").message).toBe("문자열 오류");
    expect(describeMailError(null).code).toBe("UNKNOWN");
  });
});
