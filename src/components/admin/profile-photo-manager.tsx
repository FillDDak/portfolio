"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import type { ProfilePhotoResponse } from "@/app/api/admin/profile-photo/route";
import { buttonClass } from "@/components/ui/button";
import { ProfilePhotoPosition, type PhotoSource } from "./profile-photo-position";

type Status = { type: "idle" } | { type: "ok"; message: string } | { type: "error"; message: string };

/** 홈 첫 화면에 보이는 프로필 사진을 올리고, 바꾸고, 지운다. */
export function ProfilePhotoManager({
  photoUrl,
  source,
}: {
  photoUrl: string | null;
  /** 자르기 전 원본. 있으면 보이는 부분을 고를 수 있다. */
  source: PhotoSource | null;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  async function send(method: "POST" | "DELETE", body?: FormData) {
    try {
      const response = await fetch("/api/admin/profile-photo", { method, body });
      const result = (await response.json().catch(() => null)) as ProfilePhotoResponse | null;
      if (result?.ok) return null;
      return result?.message ?? "요청을 처리하지 못했습니다.";
    } catch {
      return "네트워크 문제로 요청을 처리하지 못했습니다.";
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;
    setBusy("upload");
    setStatus({ type: "idle" });
    const formData = new FormData();
    formData.set("file", file);
    const error = await send("POST", formData);
    setBusy(null);
    if (error) {
      setStatus({ type: "error", message: error });
    } else {
      setStatus({ type: "ok", message: photoUrl ? "새 사진으로 교체했습니다." : "사진을 올렸습니다." });
      router.refresh();
    }
  }

  async function handleDelete() {
    dialogRef.current?.close();
    if (busy) return;
    setBusy("delete");
    setStatus({ type: "idle" });
    const error = await send("DELETE");
    setBusy(null);
    if (error) {
      setStatus({ type: "error", message: error });
    } else {
      setStatus({ type: "ok", message: "사진을 삭제했습니다." });
      router.refresh();
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        {photoUrl && source ? null : photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 업로드 시 이미 정사각형 webp 로 변환했다
          <img
            src={photoUrl}
            alt="현재 프로필 사진"
            width={96}
            height={96}
            className="size-24 rounded-2xl border border-line object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-24 items-center justify-center rounded-2xl border border-dashed border-line-strong text-sm text-muted"
          >
            사진 없음
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <label className={buttonClass("primary", "cursor-pointer")}>
            {busy === "upload" ? "올리는 중…" : photoUrl ? "다른 사진으로 교체" : "사진 선택"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              disabled={busy !== null}
              className="sr-only"
            />
          </label>
          {photoUrl ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => dialogRef.current?.showModal()}
              className={buttonClass("danger")}
            >
              {busy === "delete" ? "삭제 중…" : "삭제"}
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        jpg, png, webp, 5MB 이하. 처음에는 얼굴 등 눈에 띄는 부분을 가운데로 정사각형으로 잘리고, 아래에서
        보이는 부분을 바꿀 수 있습니다. 사진의 위치 정보 같은 부가 정보는 지워집니다. PC 에서는 첫 화면
        오른쪽에 크게, 모바일에서는 이름 옆에 작은 원형으로 보입니다. 지우면 사진 없이 원래 화면으로 돌아갑니다.
      </p>
      {photoUrl && !source ? (
        <p className="mt-2 text-sm text-muted">
          이 사진은 원본이 보관되지 않아 보이는 부분을 바꿀 수 없습니다. 바꾸려면 사진을 다시 올려 주세요.
        </p>
      ) : null}

      <p
        role={status.type === "error" ? "alert" : "status"}
        data-testid="photo-upload-status"
        className={
          status.type === "idle"
            ? "sr-only"
            : status.type === "ok"
              ? "mt-3 rounded-lg bg-success-soft px-3.5 py-2.5 text-[0.9375rem] font-medium text-success"
              : "mt-3 rounded-lg bg-danger-soft px-3.5 py-2.5 text-[0.9375rem] font-medium text-danger"
        }
      >
        {status.type === "idle" ? "" : status.message}
      </p>

      {photoUrl && source ? (
        <div className="mt-5 border-t border-line pt-5">
          {/* 새 사진을 올리면 편집 상태를 처음부터 다시 잡는다. */}
          <ProfilePhotoPosition key={source.url} source={source} />
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        className="confirm"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="p-5">
          <p className="text-lg font-bold tracking-tight">프로필 사진을 삭제할까요?</p>
          <p className="mt-1.5 text-muted">홈 첫 화면에서 사진이 사라집니다. 파일은 되돌릴 수 없습니다.</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => dialogRef.current?.close()} className={buttonClass("secondary")}>
              취소
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className={buttonClass("primary", "bg-danger text-white hover:bg-danger/90")}
            >
              삭제
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
