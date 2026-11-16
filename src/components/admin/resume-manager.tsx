"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import type { ResumeResponse } from "@/app/api/admin/resume/route";
import { buttonClass } from "@/components/ui/button";

type Status = { type: "idle" } | { type: "ok"; message: string } | { type: "error"; message: string };

export function ResumeManager({ hasFile, updatedAt }: { hasFile: boolean; updatedAt: string | null }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  async function send(method: "POST" | "DELETE", body?: FormData) {
    try {
      const response = await fetch("/api/admin/resume", { method, body });
      const result = (await response.json().catch(() => null)) as ResumeResponse | null;
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
      setStatus({ type: "ok", message: hasFile ? "새 파일로 교체했습니다." : "업로드했습니다." });
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
      setStatus({ type: "ok", message: "삭제했습니다." });
      router.refresh();
    }
  }

  return (
    <div>
      {hasFile ? (
        <p>
          <span className="rounded-md bg-success-soft px-2 py-0.5 text-[0.8125rem] font-semibold text-success">
            등록됨
          </span>
          {updatedAt ? <span className="ml-2 text-muted">{updatedAt} 업로드</span> : null}
        </p>
      ) : (
        <p className="text-muted">
          등록한 파일이 없습니다. 공개 페이지의 PDF 보기 버튼과 /resume 페이지는 숨겨져 있습니다.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <label className={buttonClass("primary", "cursor-pointer")}>
          {busy === "upload" ? "올리는 중…" : hasFile ? "다른 파일로 교체" : "PDF 선택"}
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFile}
            disabled={busy !== null}
            className="sr-only"
          />
        </label>
        {hasFile ? (
          <>
            <a
              href="/resume/file"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("secondary")}
            >
              현재 파일 보기
            </a>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => dialogRef.current?.showModal()}
              className={buttonClass("danger")}
            >
              {busy === "delete" ? "삭제 중…" : "삭제"}
            </button>
          </>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted">
        PDF 파일, 20MB 이하. 교체하면 이전 파일은 지워집니다. 방문자가 내려받는 파일 이름은
        “최현규_포트폴리오.pdf” 입니다.
      </p>

      <p
        role={status.type === "error" ? "alert" : "status"}
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

      <dialog
        ref={dialogRef}
        className="confirm"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="p-5">
          <p className="text-lg font-bold tracking-tight">PDF 포트폴리오를 삭제할까요?</p>
          <p className="mt-1.5 text-muted">
            공개 페이지의 PDF 보기 버튼이 사라집니다. 파일은 되돌릴 수 없습니다.
          </p>
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
