import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { getSiteUrl, SITE_MARK } from "@/lib/site";
import "./globals.css";

/*
 * 모든 페이지가 쓰는 글꼴 파일은 HTML 을 받자마자 요청한다.
 * 그냥 두면 CSS 를 다 받고 화면 배치를 시작해야 필요한 글꼴을 알게 되어, 첫 화면이 대체 글꼴로 그려진 뒤 바뀐다.
 * - IBM Plex Mono: 쓰는 굵기 3개 전부(각 15KB)
 * - Pretendard: 영문·숫자와 가장 자주 쓰는 한글이 든 묶음 하나(91번).
 *   한글 묶음을 더 미리 받으면 첫 화면이 늦어지기만 해서(실측) 나머지는 필요할 때 받는다.
 *   그 사이에 보이는 대체 글꼴은 globals.css 에서 Pretendard 와 같은 폭으로 맞춰 두어 배치가 움직이지 않는다.
 */
const PRELOAD_FONTS = [
  "/fonts/ibm-plex-mono/ibm-plex-mono-latin-400-normal.woff2",
  "/fonts/ibm-plex-mono/ibm-plex-mono-latin-500-normal.woff2",
  "/fonts/ibm-plex-mono/ibm-plex-mono-latin-600-normal.woff2",
  "/fonts/pretendard/PretendardVariable.subset.91.woff2",
];

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
  for (const href of PRELOAD_FONTS) preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="ko" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
