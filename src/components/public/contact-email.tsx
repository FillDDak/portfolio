"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";

/**
 * 문의 폼의 '받는 사람' 줄에 붙는 메일 주소와 복사 버튼.
 * 폼 대신 메일을 직접 쓰려는 사람이 주소를 바로 가져갈 수 있게 한다.
 */
export function RecipientEmail({ email }: { email: string }) {
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
    <span className="inline-flex items-center">
      <a
        ref={addressRef}
        href={`mailto:${email}`}
        className="text-[0.9375rem] break-all text-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        {email}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "메일 주소 복사됨" : "메일 주소 복사"}
        title="메일 주소 복사"
        className="ml-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        {copied ? <CheckIcon width={17} height={17} className="text-success" /> : <CopyIcon width={17} height={17} />}
      </button>
      <span role="status" className="sr-only">
        {copied ? "메일 주소를 복사했습니다." : ""}
      </span>
    </span>
  );
}
