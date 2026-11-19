"use client";

import { useId, useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";

type Status = { kind: "idle" } | { kind: "working" } | { kind: "done"; name: string } | { kind: "error"; message: string };

function fileNameFrom(disposition: string | null): string {
  return /filename="([^"]+)"/.exec(disposition ?? "")?.[1] ?? "portfolio-backup.tar.gz";
}

/** 비밀번호를 한 번 더 확인하고, 지금 시점의 백업을 PC 로 내려받는다. */
export function BackupDownload() {
  const id = useId();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "working" });
    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { message?: string } | null;
        setStatus({ kind: "error", message: result?.message ?? "백업을 내려받지 못했습니다." });
        return;
      }
      const name = fileNameFrom(response.headers.get("content-disposition"));
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.append(link);
      link.click();
      link.remove();
      // 브라우저가 저장을 시작할 시간을 준 뒤 메모리를 돌려준다.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setPassword("");
      setStatus({ kind: "done", name });
    } catch {
      setStatus({ kind: "error", message: "네트워크 문제로 내려받지 못했습니다." });
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 border-t border-line pt-4">
      <h3 className="font-semibold">지금 백업 내려받기</h3>
      <p className="mt-1 text-sm text-muted">
        지금 시점의 DB와 업로드 파일을 하나의 파일(.tar.gz)로 받습니다. 문의한 분들의 개인정보가 들어 있으니 안전한
        곳에 보관하세요.
      </p>
      <label htmlFor={`${id}-password`} className="mt-3 mb-1.5 block text-[0.9375rem] font-medium">
        관리자 비밀번호 확인
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={`${id}-password`}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={`${fieldClass} min-w-0 flex-1 basis-48`}
        />
        <button type="submit" disabled={status.kind === "working"} className={buttonClass("primary")}>
          {status.kind === "working" ? "만드는 중…" : "내려받기"}
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-6 text-sm">
        {status.kind === "error" ? <span className="text-danger">{status.message}</span> : null}
        {status.kind === "done" ? <span className="text-success">{status.name} 을(를) 내려받았습니다.</span> : null}
      </p>
    </form>
  );
}
