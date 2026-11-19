import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "@/actions/auth";
import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav";
import { MessageWatcher } from "@/components/admin/message-watcher";
import { buttonClass } from "@/components/ui/button";
import { getAdminSession, requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { getMessageSummary, messageSignature } from "@/lib/data/message-summary";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다.
// 로딩 표시를 먼저 띄우면 React 가 깜빡임을 막으려고 내용을 최소 약 0.3초 늦게 보여 주는데,
// 관리자 화면의 서버 응답은 그보다 훨씬 빨라서 오히려 느리게 느껴진다.
// instant = false 는 "이 화면은 데이터를 기다렸다가 보여 줘도 된다"는 표시다(페이지마다 같은 설정을 둔다).
export const instant = false;

const navItems: AdminNavItem[] = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/views", label: "조회 기록", dividerAfter: true },
  // 이하 홈 화면에 보이는 순서: 첫 화면(소개·PDF) → 프로젝트 → 스킬 → 자격증 → 문의 → 푸터(서비스 상태)
  { href: "/admin/profile", label: "자기소개·링크" },
  { href: "/admin/resume", label: "PDF" },
  { href: "/admin/projects", label: "프로젝트" },
  { href: "/admin/skills", label: "스킬" },
  { href: "/admin/certificates", label: "자격증" },
  { href: "/admin/messages", label: "받은 문의", dividerAfter: true },
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
          <AdminGate>{children}</AdminGate>
        </main>
      </div>
      <Suspense fallback={null}>
        <MessageWatcherSlot />
      </Suspense>
    </div>
  );
}

/** 새 문의가 오면 새로고침 없이 배지, 대시보드 숫자, 문의 목록이 바뀌게 한다. */
async function MessageWatcherSlot() {
  const session = await getAdminSession();
  if (!session) return null;
  return <MessageWatcher signature={messageSignature(await getMessageSummary())} />;
}

function AdminNavSlot() {
  // 현재 경로를 읽는 클라이언트 컴포넌트라 Suspense 로 감싼다.
  // 배지 숫자는 요청 시점에 DB 에서 세므로, 그동안은 배지 없는 메뉴를 먼저 보여 준다.
  return (
    <Suspense fallback={<div className="h-15" />}>
      <Suspense fallback={<AdminNav items={navItems} />}>
        <AdminNavWithBadges />
      </Suspense>
    </Suspense>
  );
}

async function AdminNavWithBadges() {
  // 로그인하지 않은 요청에는 숫자를 알려 주지 않는다(로그인 화면으로 보내는 일은 AdminGate 가 맡는다).
  const session = await getAdminSession();
  const unread = session ? await db.contactMessage.count({ where: { isRead: false } }) : 0;
  return (
    <AdminNav
      items={navItems}
      badges={{ "/admin/messages": { count: unread, label: "읽지 않은 문의" } }}
    />
  );
}

/** 로그인하지 않았으면 여기서 로그인 화면으로 보낸다. 각 페이지도 requireAdmin() 을 다시 호출한다. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
