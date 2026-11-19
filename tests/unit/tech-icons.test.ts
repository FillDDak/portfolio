import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { findTechIcon } = await import("@/lib/tech-icons");
const { TECH_ALIASES, techKey } = await import("@/lib/tech-icons/normalize");

describe("기술 아이콘 찾기", () => {
  it("대소문자·띄어쓰기·기호가 달라도 같은 아이콘을 찾는다", () => {
    for (const name of ["Spring Boot", "springboot", "SPRING BOOT", "spring-boot"]) {
      expect(findTechIcon(name)?.title).toBe("Spring Boot");
    }
    expect(findTechIcon("Node.js")?.title).toBe("Node.js");
    expect(findTechIcon("nodejs")?.title).toBe("Node.js");
    expect(findTechIcon("MySQL")?.title).toBe("MySQL");
  });

  it("Simple Icons 에 없는 Java, AWS 는 따로 넣은 아이콘을 쓴다", () => {
    expect(findTechIcon("Java")?.viewBox).toBe("0 0 128 128");
    expect(findTechIcon("JAVA")?.title).toBe("Java");
    expect(findTechIcon("AWS")?.title).toBe("Amazon Web Services");
    expect(findTechIcon("Amazon Web Services")?.title).toBe("Amazon Web Services");
    expect(findTechIcon("AWS EC2")?.title).toBe("Amazon Web Services");
    expect(findTechIcon("aws-s3")?.title).toBe("Amazon Web Services");
    // JavaScript 가 Java 로 잘못 잡히지 않는다.
    expect(findTechIcon("JavaScript")?.title).toBe("JavaScript");
  });

  it("로고가 없는 이름은 null", () => {
    expect(findTechIcon("JPA")).toBeNull();
    expect(findTechIcon("REST API")).toBeNull();
    expect(findTechIcon("   ")).toBeNull();
  });

  it("다른 표기 목록의 대상은 모두 실제로 있는 아이콘이다", () => {
    for (const [alias, target] of Object.entries(TECH_ALIASES)) {
      expect(findTechIcon(alias), `${alias} → ${target}`).not.toBeNull();
    }
  });

  it("이름 규칙: 기호를 Simple Icons 처럼 글자로 바꾼다", () => {
    expect(techKey("C++")).toBe("cplusplus");
    expect(techKey("Next.js")).toBe("nextdotjs");
    expect(techKey(" GitHub Actions ")).toBe("githubactions");
  });
});
