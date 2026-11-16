import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "대시보드" };

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const expires = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(session.expiresAt));

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
      <p className="mt-2 text-muted">
        {session.username} 계정으로 로그인했습니다. 세션은 {expires}에 만료됩니다.
      </p>
    </div>
  );
}
