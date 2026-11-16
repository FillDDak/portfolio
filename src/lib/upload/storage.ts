import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getEnv } from "@/lib/env";
import { checkImageUpload, checkPdfUpload, isSafeStoredName } from "./file-type";

// 메모리가 1GB 인 서버라서 sharp 가 캐시와 스레드를 많이 쓰지 않게 한다.
sharp.cache(false);
sharp.concurrency(1);

/** 긴 변 기준 최대 크기. 이보다 큰 이미지는 줄인다. */
const IMAGE_MAX_DIMENSION = 1920;

export type StoredKind = "images" | "resume";

// 업로드 폴더는 배포 폴더 밖(환경 변수로 지정)이라 빌드 도구가 경로를 추적하지 않게 turbopackIgnore 를 붙인다.
// 붙이지 않으면 프로젝트 전체가 배포 결과물에 딸려 들어간다.
function dirFor(kind: StoredKind): string {
  return path.resolve(/* turbopackIgnore: true */ getEnv().UPLOAD_DIR, kind);
}

function newName(extension: "webp" | "pdf"): string {
  // 올린 사람의 파일명은 쓰지 않고 서버에서 새로 만든다.
  return `${randomBytes(16).toString("hex")}.${extension}`;
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

/** 이미지를 검증하고 webp 로 변환·리사이즈해서 저장한다. 저장된 파일명과 크기를 돌려준다. */
export async function saveImage(bytes: Uint8Array) {
  const check = checkImageUpload(bytes);
  if (!check.ok) throw new UploadError(check.message);

  let output: Buffer;
  let width: number;
  let height: number;
  try {
    const result = await sharp(bytes, { limitInputPixels: 50_000_000 })
      .rotate() // 사진의 회전 정보(EXIF)를 반영하고, 위치 정보 같은 메타데이터는 버린다.
      .resize({
        width: IMAGE_MAX_DIMENSION,
        height: IMAGE_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    output = result.data;
    width = result.info.width;
    height = result.info.height;
  } catch {
    throw new UploadError("이미지를 읽지 못했습니다. 파일이 손상되지 않았는지 확인해 주세요.");
  }

  const name = newName("webp");
  const dir = dirFor("images");
  await mkdir(/* turbopackIgnore: true */ dir, { recursive: true });
  await writeFile(/* turbopackIgnore: true */ path.join(dir, name), output);
  return { file: name, width, height, bytes: output.length };
}

export async function savePdf(bytes: Uint8Array) {
  const check = checkPdfUpload(bytes);
  if (!check.ok) throw new UploadError(check.message);

  const name = newName("pdf");
  const dir = dirFor("resume");
  await mkdir(/* turbopackIgnore: true */ dir, { recursive: true });
  await writeFile(/* turbopackIgnore: true */ path.join(dir, name), bytes);
  return { file: name, bytes: bytes.length };
}

function resolveStored(kind: StoredKind, name: string): string | null {
  if (!isSafeStoredName(name, kind === "images" ? "webp" : "pdf")) return null;
  return path.join(dirFor(kind), name);
}

export async function readStored(kind: StoredKind, name: string) {
  const filePath = resolveStored(kind, name);
  if (!filePath) return null;
  try {
    const [data, info] = await Promise.all([
      readFile(/* turbopackIgnore: true */ filePath),
      stat(/* turbopackIgnore: true */ filePath),
    ]);
    return { data, size: info.size, modifiedAt: info.mtime };
  } catch {
    return null;
  }
}

/** 파일을 지운다. 이미 없으면 조용히 넘어간다. */
export async function deleteStored(kind: StoredKind, name: string | null | undefined) {
  if (!name) return;
  const filePath = resolveStored(kind, name);
  if (!filePath) return;
  try {
    await unlink(/* turbopackIgnore: true */ filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[upload] 파일 삭제 실패: ${kind}/${name}`, error);
    }
  }
}
