import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdminForApi, UnauthorizedError } from "@/lib/auth/guard";
import { CACHE_TAGS } from "@/lib/data/public";
import { db } from "@/lib/db";
import { IMAGE_MAX_BYTES } from "@/lib/upload/file-type";
import {
  deleteStored,
  renderProfilePhoto,
  saveProfilePhotoSource,
  UploadError,
} from "@/lib/upload/storage";

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

const PHOTO_SELECT = { photoFile: true, photoSourceFile: true } as const;

/** 프로필 사진 업로드 또는 교체. 원본을 보관하고, 처음 위치로 잘라 보여 줄 사진을 만든다. 이전 파일은 지운다. */
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

    const source = await saveProfilePhotoSource(new Uint8Array(await file.arrayBuffer()));
    let photo: Awaited<ReturnType<typeof renderProfilePhoto>>;
    try {
      photo = await renderProfilePhoto(source.file, source.crop);
    } catch (error) {
      await deleteStored("images", source.file);
      throw error;
    }

    const previous = await db.profile.findUnique({ where: { id: 1 }, select: PHOTO_SELECT });
    await db.profile.update({
      where: { id: 1 },
      data: {
        photoFile: photo.file,
        photoSourceFile: source.file,
        photoFocusX: photo.crop.x,
        photoFocusY: photo.crop.y,
        photoZoom: photo.crop.zoom,
      },
    });
    await deleteStored("images", previous?.photoFile);
    await deleteStored("images", previous?.photoSourceFile);

    // 홈 첫 화면의 사진이 바로 바뀌도록 캐시를 비운다.
    revalidateTag(CACHE_TAGS.profile, { expire: 0 });
    return json({ ok: true }, 200);
  } catch (error) {
    return fail(error, "업로드");
  }
}

const cropSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  zoom: z.number().finite(),
});

/** 보이는 부분 변경. 보관한 원본에서 다시 잘라 보여 줄 사진을 새로 만든다. */
export async function PUT(request: Request) {
  try {
    await requireAdminForApi();

    const parsed = cropSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return json({ ok: false, message: "위치 값이 올바르지 않습니다." }, 400);
    }

    const previous = await db.profile.findUnique({ where: { id: 1 }, select: PHOTO_SELECT });
    if (!previous?.photoSourceFile) {
      return json({ ok: false, message: "원본 사진이 없습니다. 사진을 다시 올려 주세요." }, 400);
    }

    const photo = await renderProfilePhoto(previous.photoSourceFile, parsed.data);
    await db.profile.update({
      where: { id: 1 },
      data: {
        photoFile: photo.file,
        photoFocusX: photo.crop.x,
        photoFocusY: photo.crop.y,
        photoZoom: photo.crop.zoom,
      },
    });
    await deleteStored("images", previous.photoFile);

    revalidateTag(CACHE_TAGS.profile, { expire: 0 });
    return json({ ok: true }, 200);
  } catch (error) {
    return fail(error, "위치 저장");
  }
}

export async function DELETE() {
  try {
    await requireAdminForApi();
    const previous = await db.profile.findUnique({ where: { id: 1 }, select: PHOTO_SELECT });
    await db.profile.update({
      where: { id: 1 },
      data: { photoFile: null, photoSourceFile: null, photoFocusX: 0.5, photoFocusY: 0.5, photoZoom: 1 },
    });
    await deleteStored("images", previous?.photoFile);
    await deleteStored("images", previous?.photoSourceFile);
    revalidateTag(CACHE_TAGS.profile, { expire: 0 });
    return json({ ok: true }, 200);
  } catch (error) {
    return fail(error, "삭제");
  }
}
