import type { Metadata } from "next";
import { NotFoundView } from "@/components/not-found-view";

export const metadata: Metadata = { title: "페이지를 찾을 수 없습니다" };

/** 어떤 페이지와도 맞지 않는 주소로 들어왔을 때 보이는 화면. 헤더 없이 이 화면만 나온다. */
export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col">
      <NotFoundView />
    </main>
  );
}
