import type { Metadata, Viewport } from "next";
import { getSiteUrl, SITE_MARK } from "@/lib/site";
import "./globals.css";

// 공개 페이지의 제목과 설명은 (public)/layout.tsx 가 프로필 내용으로 채운다. 여기는 공통 기본값이다.
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: SITE_MARK,
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1017" },
  ],
};

// 화면 모드는 기기의 주간/야간 설정을 따른다(CSS 의 prefers-color-scheme).
// 방문자가 전환 버튼으로 기기 설정과 반대 화면을 골라 둔 경우에만, 첫 페인트 전에 그 선택을 적용해 깜빡임을 막는다.
// 저장된 값이 기기 설정과 같으면 더 이상 필요 없으므로 지우고 기기 설정을 따른다.
const themeScript = `try{var t=localStorage.getItem("theme"),s=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if((t==="dark"||t==="light")&&t!==s)document.documentElement.dataset.theme=t;else if(t)localStorage.removeItem("theme")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
