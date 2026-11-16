import type { ReactNode } from "react";

/**
 * 홈 화면의 섹션 공통 틀.
 * 위쪽 가는 선과 작은 번호(01, 02 …)로 섹션을 구분한다. 번호는 실제로 표시되는 섹션 기준으로 매긴다.
 */
export function Section({
  id,
  index,
  title,
  description,
  aside,
  children,
}: {
  id: string;
  index: number;
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="border-t border-line py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 md:mb-10">
          <div>
            <p aria-hidden="true" className="font-mono text-sm font-medium text-accent-ink">
              {String(index).padStart(2, "0")}
            </p>
            <h2 id={headingId} className="mt-1 text-2xl font-bold tracking-tight md:text-[1.75rem]">
              {title}
            </h2>
            {description ? <p className="mt-2 max-w-2xl text-muted">{description}</p> : null}
          </div>
          {aside}
        </div>
        {children}
      </div>
    </section>
  );
}
