import Link from "next/link";
import { profileLinkIcons, type ProfileLink } from "./profile-links";

export function SiteFooter({
  name,
  links,
  showStatus,
}: {
  name: string;
  links: ProfileLink[];
  showStatus: boolean;
}) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between md:px-8">
        <p>© {name}</p>
        <div className="-mx-3 flex flex-wrap items-center gap-x-2 sm:mx-0">
          {/* 글을 끝까지 읽은 사람이 외부 프로필로 넘어갈 수 있게 푸터에 둔다. */}
          {links.length > 0 ? (
            <ul aria-label="외부 프로필" className="flex items-center">
              {links.map((link) => {
                const Icon = profileLinkIcons[link.key];
                return (
                  <li key={link.key}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${link.label} (새 탭에서 열림)`}
                      title={link.label}
                      className="inline-flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-surface-2 hover:text-foreground"
                    >
                      <Icon />
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {showStatus ? (
            <Link
              href="/status"
              className="inline-flex min-h-11 items-center px-3 hover:text-foreground sm:pr-0"
            >
              서비스 상태
            </Link>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
