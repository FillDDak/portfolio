"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** dividerAfter: 이 메뉴 다음에 구분선을 넣어 메뉴 묶음을 나눈다. */
export type AdminNavItem = { href: string; label: string; dividerAfter?: boolean };

/** 메뉴 옆에 붙이는 숫자 배지. 키는 메뉴 주소, 값은 개수와 화면 낭독기용 설명. */
export type AdminNavBadges = Record<string, { count: number; label: string }>;

/** 관리자 메뉴. 모바일에서는 가로로 밀어서 보는 탭, PC 에서는 왼쪽 세로 목록. */
export function AdminNav({ items, badges = {} }: { items: AdminNavItem[]; badges?: AdminNavBadges }) {
  const pathname = usePathname();

  return (
    <nav aria-label="관리자 메뉴">
      <ul className="flex gap-1 overflow-x-auto px-3 py-2 lg:flex-col lg:overflow-visible lg:p-3">
        {items.map((item) => {
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const badge = badges[item.href];
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                // relative: 배지 안의 sr-only(절대 위치) 글자가 가로 스크롤 영역을 벗어나 페이지를 넓히지 않게 한다.
                className={`relative flex min-h-11 items-center gap-2 rounded-lg px-3.5 text-[0.9375rem] font-medium whitespace-nowrap transition-colors lg:justify-between ${
                  active
                    ? "bg-accent-soft text-accent-ink"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                {item.label}
                {badge && badge.count > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-white tabular-nums">
                    <span aria-hidden="true">{badge.count > 99 ? "99+" : badge.count}</span>
                    <span className="sr-only">
                      ({badge.label} {badge.count}건)
                    </span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        }).flatMap((node, index) =>
          items[index]?.dividerAfter
            ? [
                node,
                // 모바일(가로 메뉴)에서는 세로선, PC(세로 메뉴)에서는 가로선
                <li
                  key={`${items[index]?.href}-divider`}
                  role="separator"
                  aria-hidden="true"
                  className="my-2 w-px shrink-0 self-stretch bg-line lg:mx-2 lg:my-1.5 lg:h-px lg:w-auto"
                />,
              ]
            : [node],
        )}
      </ul>
    </nav>
  );
}
