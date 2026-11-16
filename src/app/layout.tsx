import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "최현규 | 백엔드 개발자",
  description: "깊이 고민하고 확실하게 구현하는 개발자 최현규의 포트폴리오",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
