import type { MouseEvent, ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { pageItems } from "@/lib/pagination";

type Props = {
  page: number;
  last: number;
  /** 각 페이지의 주소. 새 탭으로 열거나 주소를 복사해도 같은 페이지가 열린다. */
  hrefFor: (page: number) => string;
  /** 같은 탭에서 누르면 페이지를 다시 불러오지 않고 이 함수로 바꾼다. */
  onSelect: (page: number) => void;
};

const itemClass =
  "inline-flex min-h-11 min-w-9 items-center justify-center rounded-lg px-1.5 text-[0.9375rem] font-medium tabular-nums sm:min-w-11 sm:px-2";

/** 페이지 번호 줄. 한 페이지뿐이면 그리지 않는다. */
export function Pagination({ page, last, hrefFor, onSelect }: Props) {
  if (last <= 1) return null;

  const link = (target: number, content: ReactNode, label: string, extra = "") => (
    <a
      href={hrefFor(target)}
      aria-label={label}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        // 새 탭·새 창으로 여는 클릭은 브라우저에 맡긴다.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        onSelect(target);
      }}
      className={`${itemClass} text-muted transition-colors hover:bg-surface-2 hover:text-foreground ${extra}`}
    >
      {content}
    </a>
  );

  return (
    <nav aria-label="페이지" className="mt-10 flex items-center justify-center gap-0.5 sm:gap-1">
      {page > 1 ? (
        link(page - 1, <ChevronLeftIcon width={18} height={18} />, "이전 페이지")
      ) : (
        <span aria-hidden="true" className={`${itemClass} text-muted opacity-40`}>
          <ChevronLeftIcon width={18} height={18} />
        </span>
      )}
      <ol className="flex items-center gap-0.5 sm:gap-1">
        {pageItems(page, last).map((item, index) =>
          item === "gap" ? (
            <li
              key={`gap-${index}`}
              aria-hidden="true"
              className="inline-flex min-h-11 min-w-5 items-center justify-center text-muted sm:min-w-6"
            >
              …
            </li>
          ) : (
            <li key={item}>
              {item === page ? (
                <span
                  aria-current="page"
                  aria-label={`${item}페이지, 현재 페이지`}
                  className={`${itemClass} bg-foreground font-semibold text-background`}
                >
                  {item}
                </span>
              ) : (
                link(item, item, `${item}페이지`)
              )}
            </li>
          ),
        )}
      </ol>
      {page < last ? (
        link(page + 1, <ChevronRightIcon width={18} height={18} />, "다음 페이지")
      ) : (
        <span aria-hidden="true" className={`${itemClass} text-muted opacity-40`}>
          <ChevronRightIcon width={18} height={18} />
        </span>
      )}
    </nav>
  );
}
