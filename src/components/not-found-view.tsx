import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/** 404 화면의 내용. 감싸는 쪽이 main 영역을 정한다. */
export function NotFoundView() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center px-5 py-20 md:px-8">
      <p className="font-mono text-sm font-medium text-accent-ink">404</p>
      <h1 className="mt-1 text-[1.875rem] leading-tight font-bold tracking-tight">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-3 text-muted">
        주소가 잘못되었거나, 더 이상 공개하지 않는 페이지입니다.
      </p>
      {/* 헤더 없이 이 화면만 보일 수도 있으므로 홈으로 가는 길을 항상 둔다. */}
      <Link href="/" className={buttonClass("primary", "mt-7")}>
        홈으로 가기
      </Link>
    </div>
  );
}
