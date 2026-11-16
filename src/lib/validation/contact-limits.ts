/**
 * 문의 폼 길이 제한. 화면의 maxLength 와 서버 검증이 같은 값을 쓴다.
 * 폼의 첫 화면 자바스크립트에 Zod 가 딸려 오지 않도록 스키마와 다른 파일에 둔다.
 */
export const CONTACT_LIMITS = {
  name: 50,
  email: 254,
  organization: 80,
  subject: 120,
  bodyMin: 10,
  bodyMax: 5000,
} as const;

export type ContactField = "name" | "email" | "organization" | "subject" | "body";
export type ContactFieldErrors = Partial<Record<ContactField, string>>;
