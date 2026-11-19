import { revalidateTag } from "next/cache";
import { requireAdminForApi, UnauthorizedError } from "@/lib/auth/guard";
import { CACHE_TAGS } from "@/lib/data/public";
import { db } from "@/lib/db";
import { IMAGE_MAX_BYTES } from "@/lib/upload/file-type";
import { deleteStored, saveProfilePhoto, UploadError } from "@/lib/upload/storage";

export type ProfilePhotoResponse = { ok: true } | { ok: false; message: string };

function json(body: ProfilePhotoResponse, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function fail(error: unknown, action: string) {
  if (error instanceof UnauthorizedError) return json({ ok: false, message: error.message }, 401);
  if (error instanceof UploadError) return json({ ok: false, message: error.message }, 400);
  console.error(`[profile-photo] ${action} 실패`, error);
  return json({ ok: false, message: `${action} 중 오류가 발생했습니다.` }, 500);
}

/** 프로필 사진 업로드 또는 교체. 새 사진을 저장한 뒤 이전 사진을 지운다. */
export async function POST(request: Request) {
  try {
    await requireAdminForApi();

    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > IMAGE_MAX_BYTES + 64 * 1024) {
      return json({ ok: false, message: "이미지는 5MB 이하만 올릴 수 있습니다." }, 413);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return json({ ok: false, message: "올릴 사진을 선택해 주세요." }, 400);
    }

    const saved = await saveProfilePhoto(new Uint8Array(await file.arrayBuffer()));
    const previous = await db.profile.findUnique({ where: { id: 1 }, select: { photoFile: true } });
    await db.profile.update({ where: { id: 1 }, data: { photoFile: saved.file } });
    await deleteStored("images", previous?.photoFile);

    // 홈 첫 화면의 사진이 바로 바뀌도록 캐시를 비운다.
    revalidateTag(CACHE_TAGS.profile, { expire: 0 });
    return json({ ok: true }, 200);
  } catch (error) {
    return fail(error, "업로드");
  }
}

export async function DELETE() {
  try {
    await requireAdminForApi();
    const previous = await db.profile.findUnique({ where: { id: 1 }, select: { photoFile: true } });
    await db.profile.update({ where: { id: 1 }, data: { photoFile: null } });
    await deleteStored("images", previous?.photoFile);
    revalidateTag(CACHE_TAGS.profile, { expire: 0 });
    return json({ ok: true }, 200);
  } catch (error) {
    return fail(error, "삭제");
  }
}
