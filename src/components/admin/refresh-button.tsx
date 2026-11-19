"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";

/** 페이지 전체를 다시 불러오지 않고, 서버에서 최신 값만 받아 화면을 다시 그린다. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      aria-busy={pending}
      className={buttonClass("secondary", "gap-1.5")}
    >
      <RefreshIcon width={18} height={18} className={pending ? "animate-spin" : undefined} />
      {pending ? "불러오는 중…" : "새로고침"}
    </button>
  );
}
