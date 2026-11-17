import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { SITE_MARK } from "@/lib/site";
import { MobileMenu } from "./mobile-menu";
import type { ProfileLink } from "./profile-links";
import { ThemeToggle } from "./theme-toggle";

/**
 * 메뉴 링크는 next/link 대신 기본 앵커를 쓴다.
 * 같은 페이지 안의 이동(/#projects 등)에서 Link 는 라우터를 거치느라 스크롤 시작이 0.2초쯤 늦어진다.
 */
export type NavItem = { href: string; label: string };

export function SiteHeader({ items, links }: { items: NavItem[]; links: ProfileLink[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5 md:h-16 md:px-8">
        <Link
          href="/"
          aria-label={`${SITE_MARK} 홈`}
          className="-mx-2 inline-flex min-h-11 items-center px-2 font-mono text-base font-semibold tracking-tight"
        >
          {SITE_MARK}
        </Link>

        <div className="flex items-center gap-1">
          <nav aria-label="주요 메뉴" className="hidden md:block">
            <ul className="flex items-center">
              {items.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="inline-flex min-h-11 items-center rounded-lg px-3 text-[0.9375rem] font-medium text-muted transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {/* 외부 프로필 링크는 PC 헤더에 두지 않는다(첫 화면과 푸터에 있다). 모바일은 메뉴 시트 안에 둔다. */}
          <ThemeToggle />
          <div className="ml-2 hidden md:block">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/#contact" className={buttonClass("primary", "min-h-10")}>
              문의하기
            </a>
          </div>
          <MobileMenu items={items} links={links} />
        </div>
      </div>
    </header>
  );
}
