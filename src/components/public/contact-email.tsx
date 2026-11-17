"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, MailIcon } from "@/components/icons";

/** 문의 폼 대신 메일을 직접 쓰려는 사람을 위한 주소 표시와 복사 버튼. */
export function ContactEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const addressRef = useRef<HTMLAnchorElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드를 쓸 수 없는 환경(권한 거부 등)에서는 주소를 선택해 두어 직접 복사할 수 있게 한다.
      const node = addressRef.current;
      const selection = window.getSelection();
      if (node && selection) {
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-[0.9375rem] text-muted">메일로 직접 보내셔도 됩니다.</span>
      <span className="inline-flex items-center gap-1">
        <a
          ref={addressRef}
          href={`mailto:${email}`}
          className="-mx-1 inline-flex min-h-11 items-center gap-2 px-1 font-semibold break-all underline-offset-4 hover:underline"
        >
          <MailIcon width={18} height={18} className="shrink-0 text-muted" />
          {email}
        </a>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "메일 주소 복사됨" : "메일 주소 복사"}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {copied ? <CheckIcon width={16} height={16} className="text-success" /> : <CopyIcon width={16} height={16} />}
          <span aria-hidden="true">{copied ? "복사됨" : "복사"}</span>
        </button>
      </span>
      <span role="status" className="sr-only">
        {copied ? "메일 주소를 복사했습니다." : ""}
      </span>
    </div>
  );
}
