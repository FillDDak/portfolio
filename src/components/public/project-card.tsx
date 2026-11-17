import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import type { PublicProjectCard } from "@/lib/data/public";
import { formatPeriod } from "@/lib/format";

/**
 * 프로젝트 카드. 한 줄 요약, 내 역할, 기간, 스택, 핵심 성과가 한눈에 보이게 한다.
 * 카드 전체가 상세 페이지로 가는 링크다(제목 링크의 영역을 카드 전체로 넓힘).
 */
export function ProjectCard({ project }: { project: PublicProjectCard }) {
  const featured = project.isFeatured;
  return (
    <article
      className={`group relative flex flex-col rounded-xl border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-strong md:p-7 ${
        featured ? "md:col-span-2" : ""
      }`}
    >
      <div className={featured ? "md:grid md:grid-cols-[1fr_20rem] md:gap-10" : "flex flex-1 flex-col"}>
        <div className="flex flex-col">
          {featured ? (
            <p className="mb-2 inline-flex w-fit items-center rounded-md bg-accent-soft px-2 py-0.5 text-[0.8125rem] font-semibold text-accent-ink">
              대표 프로젝트
            </p>
          ) : null}
          <h3 className={`font-bold tracking-tight ${featured ? "text-xl md:text-2xl" : "text-xl"}`}>
            <Link
              href={`/projects/${project.slug}`}
              data-track={`card:${project.id}`}
              className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent-ink"
            >
              {project.title}
            </Link>
          </h3>
          <p className="mt-2 text-muted">{project.summary}</p>

          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
            {project.role ? (
              <>
                <dt className="text-muted">역할</dt>
                <dd className="font-medium">{project.role}</dd>
              </>
            ) : null}
            <dt className="text-muted">기간</dt>
            <dd className="font-medium tabular-nums">
              {formatPeriod(project.startDate, project.endDate)}
              <span className="font-normal text-muted">
                {" · "}
                {project.teamSize > 1 ? `${project.teamSize}인 팀` : "개인"}
              </span>
            </dd>
          </dl>

          {!featured && project.highlights.length > 0 ? (
            <Highlights items={project.highlights} className="mt-4" />
          ) : null}

          {project.tags.length > 0 ? (
            <ul aria-label="사용 스택" className="mt-5 flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[0.8125rem] text-muted"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {featured && project.highlights.length > 0 ? (
          <div className="mt-5 rounded-lg bg-surface-2 p-4 md:mt-0 md:self-start md:p-5">
            <p className="text-[0.8125rem] font-semibold text-muted">핵심 성과</p>
            <Highlights items={project.highlights} className="mt-2" large />
          </div>
        ) : null}
      </div>

      <p
        aria-hidden="true"
        className="mt-5 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-accent-ink"
      >
        자세히 보기
        <ArrowRightIcon
          width={16}
          height={16}
          className="transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </p>
    </article>
  );
}

function Highlights({
  items,
  className = "",
  large = false,
}: {
  items: string[];
  className?: string;
  large?: boolean;
}) {
  return (
    <ul aria-label="핵심 성과" className={`space-y-1.5 ${className}`}>
      {items.map((item) => (
        <li
          key={item}
          className={`flex gap-2.5 font-semibold tabular-nums ${large ? "text-base" : "text-[0.9375rem]"}`}
        >
          <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-ink" />
          {item}
        </li>
      ))}
    </ul>
  );
}
