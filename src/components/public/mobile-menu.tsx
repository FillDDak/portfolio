"use client";

import { useRef } from "react";
import { ArrowUpRightIcon, CloseIcon, MailIcon, MenuIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { profileLinkIcons, type ProfileLink } from "./profile-links";
import type { NavItem } from "./site-header";

/** 모바일 내비게이션. 엄지로 닿기 쉽도록 화면 아래쪽 시트로 연다. */
export function MobileMenu({ items, links }: { items: NavItem[]; links: ProfileLink[] }) {
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
                  <a
                    href={item.href}
                    onClick={close}
                    className="flex min-h-13 items-center text-[1.0625rem] font-medium"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {links.length > 0 ? (
            <ul aria-label="외부 프로필" className="mt-3 flex flex-wrap gap-x-5">
              {links.map((link) => {
                const Icon = profileLinkIcons[link.key];
                return (
                  <li key={link.key}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={close}
                      className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted hover:text-foreground"
                    >
                      <Icon width={18} height={18} />
                      {link.label}
                      <ArrowUpRightIcon width={14} height={14} />
                      <span className="sr-only">(새 탭에서 열림)</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/#contact"
            onClick={close}
            className={buttonClass("primary", "mt-4 min-h-12 w-full")}
          >
            <MailIcon />
            문의하기
          </a>
        </div>
      </dialog>
    </div>
  );
}
