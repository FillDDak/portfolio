import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";

export type NavItem = { href: string; label: string };

export function SiteHeader({ name, items }: { name: string; items: NavItem[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5 md:h-16 md:px-8">
        <Link
          href="/"
          className="-mx-2 inline-flex min-h-11 items-center px-2 text-[1.0625rem] font-bold tracking-tight"
        >
          {name}
        </Link>

        <div className="flex items-center gap-1">
          <nav aria-label="주요 메뉴" className="hidden md:block">
            <ul className="flex items-center">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center rounded-lg px-3 text-[0.9375rem] font-medium text-muted transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ThemeToggle />
          <div className="ml-2 hidden md:block">
            <Link href="/#contact" className={buttonClass("primary", "min-h-10")}>
              문의하기
            </Link>
          </div>
          <MobileMenu items={items} />
        </div>
      </div>
    </header>
  );
}
