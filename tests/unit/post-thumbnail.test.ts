import { describe, expect, it } from "vitest";
import { firstImageUrl } from "@/lib/post-thumbnail";

const UPLOAD = "/uploads/0123456789abcdef0123456789abcdef.webp";

describe("firstImageUrl", () => {
  it("본문의 첫 이미지 주소를 돌려준다", () => {
    expect(firstImageUrl(`## 문제\n\n글\n\n![그래프](${UPLOAD})\n\n![둘째](/uploads/ffffffffffffffffffffffffffffffff.webp)`)).toBe(UPLOAD);
  });

  it("제목이 붙거나 <> 로 감싼 주소, https 주소도 읽는다", () => {
    expect(firstImageUrl(`![a](${UPLOAD} "제목")`)).toBe(UPLOAD);
    expect(firstImageUrl(`![a](<${UPLOAD}>)`)).toBe(UPLOAD);
    expect(firstImageUrl("![a](https://example.com/a.png)")).toBe("https://example.com/a.png");
  });

  it("이미지가 없거나 코드 안의 예시 문법이면 null", () => {
    expect(firstImageUrl("이미지 없는 글")).toBeNull();
    expect(firstImageUrl("[링크](https://example.com)")).toBeNull();
    expect(firstImageUrl("```md\n![예시](/uploads/x.webp)\n```")).toBeNull();
    expect(firstImageUrl("`![예시](https://example.com/a.png)`")).toBeNull();
  });

  it("코드 블록 다음에 오는 진짜 이미지는 찾는다", () => {
    expect(firstImageUrl(`\`\`\`\n![x](https://a.com/x.png)\n\`\`\`\n\n![진짜](${UPLOAD})`)).toBe(UPLOAD);
  });

  it("http, javascript:, 다른 경로는 쓰지 않는다", () => {
    expect(firstImageUrl("![a](http://example.com/a.png)")).toBeNull();
    expect(firstImageUrl("![a](javascript:alert(1))")).toBeNull();
    expect(firstImageUrl("![a](/admin/secret.png)")).toBeNull();
    expect(firstImageUrl("![a](/uploads/../etc/passwd)")).toBeNull();
  });
});
