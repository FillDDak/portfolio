import { describe, expect, it } from "vitest";
import {
  checkImageUpload,
  checkPdfUpload,
  detectFileType,
  IMAGE_MAX_BYTES,
  isSafeStoredName,
  PDF_MAX_BYTES,
} from "@/lib/upload/file-type";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);

const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0);
const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
const webp = bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50);
const pdf = text("%PDF-1.7\n...");

describe("detectFileType: 실제 내용으로 형식 판별", () => {
  it("jpg, png, webp, pdf 를 구분한다", () => {
    expect(detectFileType(jpeg)).toBe("jpeg");
    expect(detectFileType(png)).toBe("png");
    expect(detectFileType(webp)).toBe("webp");
    expect(detectFileType(pdf)).toBe("pdf");
  });

  it("다른 내용은 인정하지 않는다", () => {
    expect(detectFileType(text("<script>alert(1)</script>"))).toBeNull();
    expect(detectFileType(text("GIF89a"))).toBeNull();
    expect(detectFileType(text("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
    // RIFF 이지만 WEBP 가 아닌 파일(예: wav)
    expect(detectFileType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45))).toBeNull();
    expect(detectFileType(bytes())).toBeNull();
  });
});

describe("checkImageUpload", () => {
  it("jpg, png, webp 는 통과한다", () => {
    for (const file of [jpeg, png, webp]) expect(checkImageUpload(file).ok).toBe(true);
  });

  it("확장자만 이미지인 파일과 PDF 는 거부한다", () => {
    expect(checkImageUpload(text("이미지가 아님"))).toEqual({
      ok: false,
      message: "jpg, png, webp 형식의 이미지만 올릴 수 있습니다.",
    });
    expect(checkImageUpload(pdf).ok).toBe(false);
  });

  it("5MB 를 넘으면 거부한다", () => {
    const big = new Uint8Array(IMAGE_MAX_BYTES + 1);
    big.set(png);
    expect(checkImageUpload(big)).toEqual({ ok: false, message: "이미지는 5MB 이하만 올릴 수 있습니다." });
    const limit = new Uint8Array(IMAGE_MAX_BYTES);
    limit.set(png);
    expect(checkImageUpload(limit).ok).toBe(true);
  });

  it("빈 파일은 거부한다", () => {
    expect(checkImageUpload(bytes()).ok).toBe(false);
  });
});

describe("checkPdfUpload", () => {
  it("PDF 만 통과한다", () => {
    expect(checkPdfUpload(pdf).ok).toBe(true);
    expect(checkPdfUpload(png)).toEqual({ ok: false, message: "PDF 파일만 올릴 수 있습니다." });
  });

  it("20MB 를 넘으면 거부한다", () => {
    const big = new Uint8Array(PDF_MAX_BYTES + 1);
    big.set(pdf);
    expect(checkPdfUpload(big).ok).toBe(false);
  });
});

describe("isSafeStoredName: 서버가 만든 파일명만 허용", () => {
  it("32자리 16진수 이름만 통과한다", () => {
    expect(isSafeStoredName("0123456789abcdef0123456789abcdef.webp", "webp")).toBe(true);
    expect(isSafeStoredName("0123456789abcdef0123456789abcdef.pdf", "pdf")).toBe(true);
  });

  it("경로 조작과 다른 확장자를 막는다", () => {
    for (const name of [
      "../../etc/passwd",
      "..\\..\\portfolio.db",
      "0123456789abcdef0123456789abcdef.webp/../x",
      "0123456789abcdef0123456789abcdef.pdf",
      "0123456789ABCDEF0123456789ABCDEF.webp",
      "photo.webp",
      "",
    ]) {
      expect(isSafeStoredName(name, "webp"), name).toBe(false);
    }
  });
});
