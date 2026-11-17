import { afterEach, describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "@/lib/security-headers";
import { buildPersonJsonLd, getSiteUrl, serializeJsonLd } from "@/lib/site";

describe("getSiteUrl", () => {
  const original = process.env.SITE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = original;
  });

  it("끝의 슬래시를 떼고 돌려준다", () => {
    process.env.SITE_URL = "https://fillddak.kr/";
    expect(getSiteUrl()).toBe("https://fillddak.kr");
  });

  it("값이 없거나 주소 형식이 아니면 로컬 주소를 쓴다", () => {
    delete process.env.SITE_URL;
    expect(getSiteUrl()).toBe("http://localhost:3000");
    process.env.SITE_URL = "fillddak.kr";
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});

describe("buildPersonJsonLd", () => {
  const profile = {
    name: "최현규",
    jobTitle: "백엔드 개발자",
    tagline: "한 줄 소개",
    githubUrl: "https://github.com/FillDDak",
    velogUrl: "",
  };

  it("이름, 직무, 주소와 값이 있는 링크만 담는다", () => {
    expect(buildPersonJsonLd(profile, "https://fillddak.kr")).toEqual({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "최현규",
      jobTitle: "백엔드 개발자",
      description: "한 줄 소개",
      url: "https://fillddak.kr",
      sameAs: ["https://github.com/FillDDak"],
    });
  });

  it("링크가 하나도 없으면 sameAs 를 넣지 않는다", () => {
    const data = buildPersonJsonLd({ ...profile, githubUrl: "", tagline: "" }, "https://fillddak.kr");
    expect(data).not.toHaveProperty("sameAs");
    expect(data).not.toHaveProperty("description");
  });

  it("script 태그를 닫을 수 있는 문자를 이스케이프한다", () => {
    const text = serializeJsonLd(buildPersonJsonLd({ ...profile, name: "</script><script>alert(1)" }, "x"));
    expect(text).not.toContain("<");
    expect(JSON.parse(text).name).toBe("</script><script>alert(1)");
  });
});

describe("보안 헤더", () => {
  const csp = buildContentSecurityPolicy({ isDev: false });
  const directive = (name: string) =>
    csp.split("; ").find((part) => part.startsWith(`${name} `)) ?? "";

  it("기본은 내 사이트만 허용하고 다른 사이트에 끼워 넣지 못하게 한다", () => {
    expect(directive("default-src")).toBe("default-src 'self'");
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'self'");
    expect(directive("base-uri")).toBe("base-uri 'self'");
    expect(directive("form-action")).toBe("form-action 'self'");
  });

  it("운영에서는 eval 을 허용하지 않고 개발에서만 허용한다", () => {
    expect(directive("script-src")).not.toContain("unsafe-eval");
    expect(buildContentSecurityPolicy({ isDev: true })).toContain("'unsafe-eval'");
  });

  it("스크립트는 내 사이트와 Turnstile 에서만 불러온다", () => {
    expect(directive("script-src")).toBe(
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    );
  });

  it("CSP 외의 보안 헤더를 함께 붙인다", () => {
    const headers = Object.fromEntries(
      buildSecurityHeaders({ isDev: false }).map(({ key, value }) => [key, value]),
    );
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Content-Security-Policy"]).toBe(csp);
  });
});
