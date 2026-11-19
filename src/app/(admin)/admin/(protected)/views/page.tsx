import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, Panel } from "@/components/admin/page-header";
import { buttonClass } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/field";
import { getViewLog, VIEW_LOG_PAGE_SIZE } from "@/lib/analytics/stats";
import { DEVICE_KIND_LABEL } from "@/lib/device/describe";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/format";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다(아래 layout.tsx 설명 참고).
export const instant = false;

export const metadata: Metadata = { title: "조회 기록" };

const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

function pageLabel(path: string, titles: Map<string, string>): string {
  if (path === "/") return "홈";
  if (path === "/resume") return "PDF 포트폴리오";
  if (path === "/status") return "상태 페이지";
  const slug = path.replace("/projects/", "");
  return titles.get(slug) ?? path;
}

export default async function ViewsPage({ searchParams }: PageProps<"/admin/views">) {
  await requireAdmin();
  const params = await searchParams;
  const from = isDate(params.from) ? params.from : undefined;
  const to = isDate(params.to) ? params.to : undefined;
  const projectNumber = Number(typeof params.project === "string" ? params.project : "");
  const projectId = Number.isInteger(projectNumber) && projectNumber > 0 ? projectNumber : undefined;
  const pageNumber = Number(typeof params.page === "string" ? params.page : "1");
  const page = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;

  const [log, projects] = await Promise.all([
    getViewLog({ from, to, projectId, page }),
    db.project.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, title: true, slug: true },
    }),
  ]);
  const titles = new Map(projects.map((project) => [project.slug, project.title]));
  const retentionDays = getEnv().PAGEVIEW_RETENTION_DAYS;

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (projectId) query.set("project", String(projectId));
    if (target > 1) query.set("page", String(target));
    const text = query.toString();
    return text ? `/admin/views?${text}` : "/admin/views";
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="조회 기록"
        description={`최근 ${retentionDays}일의 상세 기록입니다. 그보다 오래된 기록은 삭제되고 일별 합계만 남습니다. IP 주소는 저장하지 않습니다.`}
      />

      <Panel>
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
          <div>
            <label htmlFor="from" className={labelClass}>
              시작일
            </label>
            <input id="from" name="from" type="date" defaultValue={from} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="to" className={labelClass}>
              종료일
            </label>
            <input id="to" name="to" type="date" defaultValue={to} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="project" className={labelClass}>
              프로젝트
            </label>
            <select id="project" name="project" defaultValue={projectId ?? ""} className={fieldClass}>
              <option value="">전체 페이지</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className={buttonClass("primary", "flex-1")}>
              적용
            </button>
            <Link href="/admin/views" className={buttonClass("secondary")}>
              초기화
            </Link>
          </div>
        </form>
      </Panel>

      <p className="mt-5 mb-3 text-muted tabular-nums">
        {log.count.toLocaleString("ko-KR")}건
        {log.count > 0 ? ` · ${page} / ${log.pageCount} 쪽` : ""}
      </p>

      {log.rows.length === 0 ? (
        <EmptyState>조건에 맞는 조회 기록이 없습니다.</EmptyState>
      ) : (
        <>
          {/* PC: 표 */}
          <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-[0.9375rem]">
              <thead className="bg-surface-2 text-left">
                <tr>
                  {["조회 시각", "페이지", "유입 사이트", "기기"].map((heading) => (
                    <th key={heading} scope="col" className="px-4 py-2.5 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {log.rows.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{pageLabel(row.path, titles)}</td>
                    <td className="px-4 py-2.5">
                      <Referrer domain={row.referrerDomain} utm={row.utmSource} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Device row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일: 카드 */}
          <ul className="space-y-2.5 md:hidden">
            {log.rows.map((row) => (
              <li key={row.id} className="rounded-xl border border-line bg-surface p-3.5">
                <p className="font-semibold">{pageLabel(row.path, titles)}</p>
                <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.9375rem]">
                  <dt className="text-muted">시각</dt>
                  <dd className="tabular-nums">{formatDateTime(row.createdAt)}</dd>
                  <dt className="text-muted">유입</dt>
                  <dd>
                    <Referrer domain={row.referrerDomain} utm={row.utmSource} />
                  </dd>
                  <dt className="text-muted">기기</dt>
                  <dd>
                    <Device row={row} />
                  </dd>
                </dl>
              </li>
            ))}
          </ul>

          <nav aria-label="쪽 이동" className="mt-4 flex items-center justify-between gap-2">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={buttonClass("secondary")}>
                ← 이전
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted tabular-nums">
              {(page - 1) * VIEW_LOG_PAGE_SIZE + 1}–{(page - 1) * VIEW_LOG_PAGE_SIZE + log.rows.length}번째
            </span>
            {page < log.pageCount ? (
              <Link href={pageHref(page + 1)} className={buttonClass("secondary")}>
                다음 →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </>
      )}
    </div>
  );
}

function Referrer({ domain, utm }: { domain: string; utm: string }) {
  return (
    <>
      {domain || <span className="text-muted">직접 접속</span>}
      {utm ? (
        <span className="ml-2 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[0.8125rem] text-muted">
          utm: {utm}
        </span>
      ) : null}
    </>
  );
}

function Device({ row }: { row: { device: string; browser: string; os: string; model: string } }) {
  const detail = [row.os, row.model, row.browser].filter(Boolean).join(" · ");
  return (
    <>
      <span className="whitespace-nowrap">{DEVICE_KIND_LABEL[row.device] ?? row.device}</span>
      {detail ? <span className="block text-sm text-muted">{detail}</span> : null}
    </>
  );
}
