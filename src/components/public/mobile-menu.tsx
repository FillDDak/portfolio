"use client";

import Link from "next/link";
import { useRef } from "react";
import { CloseIcon, MailIcon, MenuIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import type { NavItem } from "./site-header";

/** 모바일 내비게이션. 엄지로 닿기 쉽도록 화면 아래쪽 시트로 연다. */
export function MobileMenu({ items }: { items: NavItem[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="메뉴 열기"
        aria-haspopup="dialog"
        className="inline-flex size-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-2"
      >
        <MenuIcon />
      </button>

      <dialog
        ref={dialogRef}
        className="sheet"
        aria-label="메뉴"
        onClick={(event) => {
          // 시트 바깥(배경)을 누르면 닫는다.
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted">메뉴</p>
            <button
              type="button"
              onClick={close}
              aria-label="메뉴 닫기"
              className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <CloseIcon />
            </button>
          </div>
          <nav aria-label="주요 메뉴">
            <ul className="divide-y divide-line border-y border-line">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className="flex min-h-13 items-center text-[1.0625rem] font-medium"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link
            href="/#contact"
            onClick={close}
            className={buttonClass("primary", "mt-4 min-h-12 w-full")}
          >
            <MailIcon />
            문의하기
          </Link>
        </div>
      </dialog>
    </div>
  );
}
