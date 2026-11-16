import type { Metadata } from "next";

// 관리자 화면은 검색 엔진에 노출하지 않는다.
export const metadata: Metadata = {
  title: { default: "관리자", template: "%s | 관리자" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
