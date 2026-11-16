import { z } from "zod";

import { CONTACT_LIMITS, type ContactFieldErrors } from "./contact-limits";

export { CONTACT_LIMITS };
export type { ContactField, ContactFieldErrors } from "./contact-limits";

// 메일 헤더에 들어가는 값에는 줄바꿈 같은 제어 문자를 허용하지 않는다(헤더 주입 방지).
const noControlChars = (value: string) => !/[\u0000-\u001f\u007f]/.test(value);

const singleLine = (emptyMessage: string, tooLongMessage: string, max: number) =>
  z
    .string({ error: emptyMessage })
    .trim()
    .min(1, emptyMessage)
    .max(max, tooLongMessage)
    .refine(noControlChars, "사용할 수 없는 문자가 들어 있습니다.");

/** 클라이언트와 서버가 함께 쓰는 문의 폼 검증 스키마 */
export const contactSchema = z.object({
  name: singleLine(
    "이름을 입력해 주세요.",
    `이름은 ${CONTACT_LIMITS.name}자 이하로 입력해 주세요.`,
    CONTACT_LIMITS.name,
  ),
  email: z
    .string({ error: "메일 주소를 입력해 주세요." })
    .trim()
    .min(1, "메일 주소를 입력해 주세요.")
    .max(CONTACT_LIMITS.email, "메일 주소가 너무 깁니다.")
    .pipe(z.email("메일 주소 형식이 올바르지 않습니다.")),
  organization: z
    .string()
    .trim()
    .max(CONTACT_LIMITS.organization, `소속은 ${CONTACT_LIMITS.organization}자 이하로 입력해 주세요.`)
    .refine(noControlChars, "소속에 사용할 수 없는 문자가 있습니다.")
    .optional()
    .default(""),
  subject: singleLine(
    "제목을 입력해 주세요.",
    `제목은 ${CONTACT_LIMITS.subject}자 이하로 입력해 주세요.`,
    CONTACT_LIMITS.subject,
  ),
  body: z
    .string({ error: "내용을 입력해 주세요." })
    .trim()
    .min(CONTACT_LIMITS.bodyMin, `내용은 ${CONTACT_LIMITS.bodyMin}자 이상 입력해 주세요.`)
    .max(CONTACT_LIMITS.bodyMax, `내용은 ${CONTACT_LIMITS.bodyMax}자 이하로 입력해 주세요.`),
  /** 허니팟. 사람에게는 보이지 않는 칸이라 값이 있으면 봇으로 본다. */
  website: z.string().max(200).optional().default(""),
  turnstileToken: z.string().max(4096).optional().default(""),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Zod 오류를 "필드 → 첫 번째 메시지" 형태로 바꾼다. */
export function toFieldErrors(error: z.ZodError): ContactFieldErrors {
  const result: ContactFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      (field === "name" ||
        field === "email" ||
        field === "organization" ||
        field === "subject" ||
        field === "body") &&
      !result[field]
    ) {
      result[field] = issue.message;
    }
  }
  return result;
}
