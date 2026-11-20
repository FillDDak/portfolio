import { describe, expect, it } from "vitest";
import { moveInList } from "@/lib/reorder";
import {
  certificateSchema,
  experienceSchema,
  flattenErrors,
  monitorSchema,
  profileSchema,
  projectSchema,
  skillSchema,
  slugify,
} from "@/lib/validation/content";

const project = {
  title: "쿠폰 시스템",
  slug: "coupon-system",
  summary: "선착순 쿠폰 API",
  teamSize: "4",
  startDate: "2026-03",
};

describe("projectSchema", () => {
  it("필수 값만으로 통과하고 나머지는 기본값을 채운다", () => {
    const parsed = projectSchema.parse(project);
    expect(parsed.teamSize).toBe(4);
    expect(parsed.endDate).toBe("");
    expect(parsed.isPublished).toBe(false);
    expect(parsed.tags).toEqual([]);
    expect(parsed.images).toEqual([]);
  });

  it("slug 는 영문 소문자, 숫자, 하이픈만 허용한다", () => {
    for (const slug of ["Coupon", "쿠폰", "a b", "-a", "a-", "a--b", "a/b", "../x"]) {
      expect(projectSchema.safeParse({ ...project, slug }).success, slug).toBe(false);
    }
    expect(projectSchema.safeParse({ ...project, slug: "a1-b2-c3" }).success).toBe(true);
  });

  it("종료 월이 시작 월보다 빠르면 거부한다", () => {
    const result = projectSchema.safeParse({ ...project, endDate: "2026-02" });
    expect(result.success).toBe(false);
    if (!result.success) expect(flattenErrors(result.error).endDate).toMatch(/빠를 수 없습니다/);
    expect(projectSchema.safeParse({ ...project, endDate: "2026-03" }).success).toBe(true);
  });

  it("기간 형식을 검사한다", () => {
    expect(projectSchema.safeParse({ ...project, startDate: "2026-13" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, startDate: "2026/03" }).success).toBe(false);
  });

  it("링크는 http(s) 주소만 허용한다", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,x", "ftp://example.com", "example.com"]) {
      expect(projectSchema.safeParse({ ...project, demoUrl: url }).success, url).toBe(false);
    }
    expect(projectSchema.safeParse({ ...project, demoUrl: "https://example.com/demo" }).success).toBe(true);
    expect(projectSchema.safeParse({ ...project, demoUrl: "" }).success).toBe(true);
  });

  it("이미지는 서버가 만든 파일명만 받는다", () => {
    const file = "0123456789abcdef0123456789abcdef.webp";
    expect(projectSchema.safeParse({ ...project, coverImage: file }).success).toBe(true);
    expect(projectSchema.safeParse({ ...project, coverImage: "../secret.webp" }).success).toBe(false);
    expect(
      projectSchema.safeParse({ ...project, images: [{ file: "https://evil.example/x.webp", alt: "" }] })
        .success,
    ).toBe(false);
  });

  it("인원은 1명 이상의 정수여야 한다", () => {
    expect(projectSchema.safeParse({ ...project, teamSize: "0" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, teamSize: "1.5" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, teamSize: "abc" }).success).toBe(false);
  });
});

describe("그 밖의 스키마", () => {
  it("profileSchema: 이름·직무·한 줄 소개는 필수, 링크는 http(s) 만", () => {
    const base = { name: "최현규", jobTitle: "백엔드 개발자", tagline: "소개" };
    expect(profileSchema.safeParse(base).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, name: " " }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, notionUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("profileSchema: 공개 이메일은 비우거나 메일 주소 형식만", () => {
    const base = { name: "최현규", jobTitle: "백엔드 개발자", tagline: "소개" };
    expect(profileSchema.parse(base).contactEmail).toBe("");
    expect(profileSchema.parse({ ...base, contactEmail: " me@example.com " }).contactEmail).toBe("me@example.com");
    expect(profileSchema.safeParse({ ...base, contactEmail: "not-an-email" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, contactEmail: "a@b.c\"><script>" }).success).toBe(false);
  });

  it("skillSchema: 숙련도는 두 단계만", () => {
    expect(skillSchema.safeParse({ name: "Java", level: "USED" }).success).toBe(true);
    expect(skillSchema.safeParse({ name: "Java", level: "LEARNED" }).success).toBe(true);
    expect(skillSchema.safeParse({ name: "Java", level: "90%" }).success).toBe(false);
  });

  it("certificateSchema: 실제로 있는 날짜만", () => {
    const base = { name: "정보처리기사", issuer: "한국산업인력공단" };
    expect(certificateSchema.safeParse({ ...base, acquiredAt: "2026-06-12" }).success).toBe(true);
    expect(certificateSchema.safeParse({ ...base, acquiredAt: "2026-02-30" }).success).toBe(false);
    expect(certificateSchema.safeParse({ ...base, acquiredAt: "" }).success).toBe(false);
  });

  it("monitorSchema: http(s) 주소만", () => {
    expect(monitorSchema.safeParse({ name: "przo", url: "https://przo.kr" }).success).toBe(true);
    expect(monitorSchema.safeParse({ name: "x", url: "file:///etc/passwd" }).success).toBe(false);
  });
});

describe("experienceSchema", () => {
  const base = { kind: "TRAINING", title: "백엔드 부트캠프", startDate: "2025-03", endDate: "2025-09" };

  it("선택 항목은 비워 둘 수 있고, 관련 프로젝트는 숫자 id 또는 없음", () => {
    const parsed = experienceSchema.parse({ ...base, projectId: "" });
    expect(parsed).toMatchObject({ subtitle: "", description: "", projectId: null });
    expect(experienceSchema.parse({ ...base, projectId: "3" }).projectId).toBe(3);
  });

  it("수상은 종료 월을 저장하지 않는다", () => {
    expect(experienceSchema.parse({ ...base, kind: "AWARD" }).endDate).toBe("");
  });

  it("종류, 기간 순서, 형식을 검사한다", () => {
    const errors = (input: Record<string, unknown>) => {
      const result = experienceSchema.safeParse(input);
      return result.success ? {} : flattenErrors(result.error);
    };
    expect(errors({ ...base, kind: "JOB" })).toHaveProperty("kind");
    expect(errors({ ...base, endDate: "2025-01" })).toHaveProperty("endDate");
    expect(errors({ ...base, startDate: "2025-13" })).toHaveProperty("startDate");
    expect(errors({ ...base, description: "가".repeat(301) })).toHaveProperty("description");
  });
});

describe("slugify", () => {
  it("영문과 숫자만 남기고 하이픈으로 잇는다", () => {
    expect(slugify("Coupon System v2!")).toBe("coupon-system-v2");
    expect(slugify("  선착순 Coupon 발급  ")).toBe("coupon");
    expect(slugify("한글만")).toBe("");
  });
});

describe("moveInList: 순서 변경", () => {
  it("한 칸 위와 아래로 옮긴다", () => {
    expect(moveInList([1, 2, 3], 2, "up")).toEqual([2, 1, 3]);
    expect(moveInList([1, 2, 3], 2, "down")).toEqual([1, 3, 2]);
  });

  it("끝에서는 더 옮길 수 없다", () => {
    expect(moveInList([1, 2, 3], 1, "up")).toBeNull();
    expect(moveInList([1, 2, 3], 3, "down")).toBeNull();
  });

  it("없는 id 는 무시하고 원본은 바꾸지 않는다", () => {
    const ids = [1, 2, 3];
    expect(moveInList(ids, 9, "up")).toBeNull();
    moveInList(ids, 2, "up");
    expect(ids).toEqual([1, 2, 3]);
  });
});
