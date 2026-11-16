import Link from "next/link";

export function SiteFooter({ name, showStatus }: { name: string; showStatus: boolean }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between md:px-8">
        <p>© {name}</p>
        {showStatus ? (
          <Link
            href="/status"
            className="-my-3 inline-flex min-h-11 items-center hover:text-foreground"
          >
            서비스 상태
          </Link>
        ) : null}
      </div>
    </footer>
  );
}
