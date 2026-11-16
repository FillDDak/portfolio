export type DetectedType = "jpeg" | "png" | "webp" | "pdf";

/**
 * 파일의 실제 내용(앞부분 바이트)으로 형식을 판별한다.
 * 확장자나 브라우저가 보낸 Content-Type 은 쉽게 속일 수 있어서 믿지 않는다.
 */
export function detectFileType(bytes: Uint8Array): DetectedType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  // RIFF????WEBP
  if (
    bytes.length >= 12 &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  // %PDF-
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "pdf";
  }
  return null;
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PDF_MAX_BYTES = 20 * 1024 * 1024;

export type UploadCheck = { ok: true; type: DetectedType } | { ok: false; message: string };

/** 이미지 업로드 검증: jpg, png, webp 만, 5MB 이하 */
export function checkImageUpload(bytes: Uint8Array): UploadCheck {
  if (bytes.length === 0) return { ok: false, message: "파일이 비어 있습니다." };
  if (bytes.length > IMAGE_MAX_BYTES) {
    return { ok: false, message: "이미지는 5MB 이하만 올릴 수 있습니다." };
  }
  const type = detectFileType(bytes);
  if (type !== "jpeg" && type !== "png" && type !== "webp") {
    return { ok: false, message: "jpg, png, webp 형식의 이미지만 올릴 수 있습니다." };
  }
  return { ok: true, type };
}

/** PDF 업로드 검증: 20MB 이하 */
export function checkPdfUpload(bytes: Uint8Array): UploadCheck {
  if (bytes.length === 0) return { ok: false, message: "파일이 비어 있습니다." };
  if (bytes.length > PDF_MAX_BYTES) {
    return { ok: false, message: "PDF 는 20MB 이하만 올릴 수 있습니다." };
  }
  if (detectFileType(bytes) !== "pdf") {
    return { ok: false, message: "PDF 파일만 올릴 수 있습니다." };
  }
  return { ok: true, type: "pdf" };
}

/** 서버가 만든 파일명만 통과시킨다. 경로 조작(../ 등)을 막는다. */
export function isSafeStoredName(name: string, extension: "webp" | "pdf"): boolean {
  return new RegExp(`^[a-f0-9]{32}\\.${extension}$`).test(name);
}
