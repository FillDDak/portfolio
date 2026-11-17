import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "@/actions/auth";
import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guard";

const navItems: AdminNavItem[] = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/views", label: "조회 기록" },
  // 이하 홈 화면에 보이는 순서: 첫 화면(소개·PDF) → 프로젝트 → 스킬 → 자격증 → 문의 → 푸터(서비스 상태)
  { href: "/admin/profile", label: "자기소개·링크" },
  { href: "/admin/resume", label: "PDF" },
  { href: "/admin/projects", label: "프로젝트" },
  { href: "/admin/skills", label: "스킬" },
  { href: "/admin/certificates", label: "자격증" },
  { href: "/admin/messages", label: "받은 문의" },
  { href: "/admin/monitors", label: "상태 감시" },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
          <Link href="/admin" className="text-[1.0625rem] font-bold tracking-tight">
            관리자
          </Link>
          <div className="flex items-center gap-1">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("ghost", "min-h-10 px-3 text-muted")}
            >
              사이트 보기
            </a>
            <form action={logoutAction}>
              <button type="submit" className={buttonClass("secondary", "min-h-10 px-3")}>
                로그아웃
              </button>
            </form>
          </div>
        </div>
        <div className="border-t border-line lg:hidden">
          <AdminNavSlot />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-52 shrink-0 border-r border-line lg:block">
          <div className="sticky top-14">
            <AdminNavSlot />
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {/* 세션 확인과 데이터 조회는 요청 시점에 일어나므로 Suspense 안에서 처리한다. */}
          <Suspense fallback={<p className="text-muted">불러오는 중…</p>}>
            <AdminGate>{children}</AdminGate>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function AdminNavSlot() {
  // 현재 경로를 읽는 클라이언트 컴포넌트라 Suspense 로 감싼다.
  return (
    <Suspense fallback={<div className="h-15" />}>
      <AdminNav items={navItems} />
    </Suspense>
  );
}

/** 로그인하지 않았으면 여기서 로그인 화면으로 보낸다. 각 페이지도 requireAdmin() 을 다시 호출한다. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
