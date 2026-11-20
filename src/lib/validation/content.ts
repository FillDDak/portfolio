import { z } from "zod";

/** 관리자 화면에서 입력하는 콘텐츠의 검증 스키마. 폼(클라이언트)과 Server Action(서버)이 함께 쓴다. */

const text = (label: string, max: number) =>
  z
    .string({ error: `${label} 항목을 입력해 주세요.` })
    .trim()
    .min(1, `${label} 항목을 입력해 주세요.`)
    .max(max, `${label} 항목은 ${max}자 이하로 입력해 주세요.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} 항목은 ${max}자 이하로 입력해 주세요.`)
    .optional()
    .default("");

/** 비워 두거나 http(s) 주소만 허용한다. javascript: 같은 주소는 링크로 쓰이면 위험하다. */
const optionalUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(300, `${label} 주소가 너무 깁니다.`)
    .refine((value) => value === "" || isHttpUrl(value), `${label} 주소는 http:// 또는 https:// 로 시작해야 합니다.`)
    .optional()
    .default("");

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const storedImage = z.string().regex(/^[a-f0-9]{32}\.webp$/, "이미지 파일 정보가 올바르지 않습니다.");

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "기간은 YYYY-MM 형식으로 입력해 주세요.");

export const profileSchema = z.object({
  name: text("이름", 30),
  jobTitle: text("직무", 40),
  tagline: text("한 줄 소개", 80),
  bio: optionalText("자기소개", 600),
  coreStack: optionalText("핵심 스택", 300),
  githubUrl: optionalUrl("GitHub"),
  velogUrl: optionalUrl("Velog"),
  notionUrl: optionalUrl("Notion"),
  contactEmail: z
    .string()
    .trim()
    .max(254, "메일 주소가 너무 깁니다.")
    .refine((value) => value === "" || z.email().safeParse(value).success, "메일 주소 형식이 올바르지 않습니다.")
    .optional()
    .default(""),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const projectSchema = z
  .object({
    title: text("제목", 100),
    slug: z
      .string()
      .trim()
      .min(1, "주소(slug)를 입력해 주세요.")
      .max(80, "주소(slug)는 80자 이하로 입력해 주세요.")
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "주소(slug)는 영문 소문자, 숫자, 하이픈(-)만 쓸 수 있습니다. 예: coupon-system",
      ),
    summary: text("한 줄 요약", 200),
    role: optionalText("역할", 100),
    teamSize: z.coerce
      .number({ error: "인원은 숫자로 입력해 주세요." })
      .int("인원은 정수로 입력해 주세요.")
      .min(1, "인원은 1명 이상이어야 합니다.")
      .max(100, "인원은 100명 이하로 입력해 주세요."),
    startDate: month,
    endDate: z.union([month, z.literal("")]).optional().default(""),
    highlights: optionalText("핵심 성과", 600),
    body: optionalText("본문", 50_000),
    coverImage: z.union([storedImage, z.literal("")]).optional().default(""),
    demoUrl: optionalUrl("데모"),
    githubUrl: optionalUrl("GitHub"),
    docsUrl: optionalUrl("API 문서"),
    isPublished: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    tags: z
      .array(z.string().trim().min(1).max(30, "스택 태그는 30자 이하로 입력해 주세요."))
      .max(20, "스택 태그는 20개까지 넣을 수 있습니다.")
      .default([]),
    images: z
      .array(z.object({ file: storedImage, alt: optionalText("이미지 설명", 120) }))
      .max(20, "갤러리 이미지는 20장까지 넣을 수 있습니다.")
      .default([]),
  })
  .refine((value) => value.endDate === "" || value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "종료 월은 시작 월보다 빠를 수 없습니다.",
  });

export type ProjectInput = z.infer<typeof projectSchema>;

export const skillCategorySchema = z.object({ name: text("분류 이름", 30) });

export const skillSchema = z.object({
  name: text("스킬 이름", 40),
  level: z.enum(["USED", "LEARNED"], { error: "숙련도를 선택해 주세요." }),
});

export const certificateSchema = z.object({
  name: text("자격증 이름", 80),
  issuer: text("발급기관", 80),
  acquiredAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "취득일을 선택해 주세요.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "취득일이 올바른 날짜가 아닙니다."),
});

/** 경험 종류. 공개 페이지에서 이 순서로 묶어 보여 준다(채용 담당자가 먼저 확인하는 순). */
export const EXPERIENCE_KINDS = ["EDUCATION", "TRAINING", "ACTIVITY", "AWARD"] as const;
export type ExperienceKind = (typeof EXPERIENCE_KINDS)[number];
export const EXPERIENCE_KIND_LABEL: Record<ExperienceKind, string> = {
  EDUCATION: "학력",
  TRAINING: "교육",
  ACTIVITY: "활동",
  AWARD: "수상",
};

export const experienceSchema = z
  .object({
    kind: z.enum(EXPERIENCE_KINDS, { error: "종류를 선택해 주세요." }),
    title: text("이름", 80),
    subtitle: optionalText("세부 내용", 100),
    startDate: month,
    endDate: z.union([month, z.literal("")]).optional().default(""),
    description: optionalText("설명", 300),
    projectId: z
      .union([z.literal(""), z.coerce.number().int().positive()])
      .optional()
      .transform((value) => (typeof value === "number" ? value : null)),
  })
  // 수상은 받은 달 하나만 쓴다.
  .transform((value) => (value.kind === "AWARD" ? { ...value, endDate: "" } : value))
  .refine((value) => value.endDate === "" || value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "종료 월은 시작 월보다 빠를 수 없습니다.",
  });

export type ExperienceInput = z.infer<typeof experienceSchema>;

export const monitorSchema = z.object({
  name: text("이름", 40),
  description: optionalText("설명", 120),
  url: z
    .string()
    .trim()
    .min(1, "주소를 입력해 주세요.")
    .max(300, "주소가 너무 깁니다.")
    .refine(isHttpUrl, "주소는 http:// 또는 https:// 로 시작해야 합니다."),
  isActive: z.boolean().default(true),
});

/** Zod 오류를 "필드 이름 → 첫 번째 메시지" 로 바꾼다. 배열 안의 오류는 배열 이름으로 모은다. */
export function flattenErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

/** 제목에서 주소(slug) 초안을 만든다. 한글은 주소에 쓰지 않으므로 영문과 숫자만 남긴다. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
