import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "관리자 로그인" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight">관리자 로그인</h1>
        <p className="mt-1.5 mb-6 text-muted">포트폴리오 관리 화면입니다.</p>
        <LoginForm />
      </div>
    </main>
  );
}
