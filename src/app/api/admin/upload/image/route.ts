import { requireAdminForApi, UnauthorizedError } from "@/lib/auth/guard";
import { IMAGE_MAX_BYTES } from "@/lib/upload/file-type";
import { saveImage, UploadError } from "@/lib/upload/storage";

export type ImageUploadResponse =
  | { ok: true; file: string; url: string; width: number; height: number }
  | { ok: false; message: string };

function json(body: ImageUploadResponse, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** 이미지 업로드. 형식(실제 내용 기준)과 용량을 검증하고 webp 로 변환해 저장한다. */
export async function POST(request: Request) {
  try {
    await requireAdminForApi();

    // 본문을 읽기 전에 크기부터 확인한다(멀티파트 포장 분량으로 여유를 조금 둔다).
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > IMAGE_MAX_BYTES + 64 * 1024) {
      return json({ ok: false, message: "이미지는 5MB 이하만 올릴 수 있습니다." }, 413);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return json({ ok: false, message: "올릴 파일을 선택해 주세요." }, 400);
    }

    const saved = await saveImage(new Uint8Array(await file.arrayBuffer()));
    return json(
      {
        ok: true,
        file: saved.file,
        url: `/uploads/${saved.file}`,
        width: saved.width,
        height: saved.height,
      },
      200,
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return json({ ok: false, message: error.message }, 401);
    if (error instanceof UploadError) return json({ ok: false, message: error.message }, 400);
    console.error("[upload] 이미지 업로드 실패", error);
    return json({ ok: false, message: "업로드 중 오류가 발생했습니다." }, 500);
  }
}
