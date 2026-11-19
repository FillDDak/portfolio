import type { Metadata } from "next";
import Link from "next/link";
import { ContentStatsPanel } from "@/components/admin/content-stats";
import { DailyChart } from "@/components/admin/daily-chart";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { RealtimeCount } from "@/components/admin/realtime-count";
import { RefreshButton } from "@/components/admin/refresh-button";
import { buttonClass } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { getContentStats, getDailyTrend, getProjectViews, getSiteTotals } from "@/lib/analytics/stats";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다(아래 layout.tsx 설명 참고).
export const instant = false;

export const metadata: Metadata = { title: "대시보드" };

const TREND_DAYS = 30;
const number = (value: number) => value.toLocaleString("ko-KR");

export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const params = await searchParams;
  const selected = Number(typeof params.project === "string" ? params.project : "");
  const projectId = Number.isInteger(selected) && selected > 0 ? selected : null;

  const [totals, projects, trend, unread, content] = await Promise.all([
    getSiteTotals(),
    getProjectViews(),
    getDailyTrend({ days: TREND_DAYS, projectId }),
    db.contactMessage.count({ where: { isRead: false } }),
    getContentStats(TREND_DAYS),
  ]);
  const selectedProject = projects.find((project) => project.id === projectId);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="대시보드"
        description="조회수와 방문자 수는 이 화면에서만 볼 수 있고 공개 페이지에는 표시되지 않습니다."
        action={<RefreshButton />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RealtimeCount />
        <StatTile label="오늘 조회" value={totals.today} note="한국 시간 기준" />
        <StatTile label="최근 7일 조회" value={totals.last7} note={`전체 ${number(totals.total)}회`} />
        <Link
          href="/admin/messages"
          className="rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong md:p-5"
        >
          <p className="text-[0.9375rem] font-medium text-muted">읽지 않은 문의</p>
          <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
            {number(unread)}
            <span className="ml-1 text-lg font-semibold text-muted">건</span>
          </p>
          <p className="mt-1 text-sm font-medium text-accent-ink">받은 문의 보기 →</p>
        </Link>
      </div>

      <Panel className="mt-5">
        <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label htmlFor="project" className="mb-1.5 block text-[0.9375rem] font-medium">
              추이를 볼 대상
            </label>
            <select id="project" name="project" defaultValue={projectId ?? ""} className={fieldClass}>
              <option value="">사이트 전체</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={buttonClass("secondary")}>
            보기
          </button>
        </form>
        <DailyChart
          points={trend}
          label={`${selectedProject ? selectedProject.title : "사이트 전체"} · 최근 ${TREND_DAYS}일 일별 조회수`}
        />
      </Panel>

      <Panel title="프로젝트별 조회수" className="mt-5">
        {projects.length === 0 ? (
          <p className="text-muted">등록한 프로젝트가 없습니다.</p>
        ) : (
          <>
            {/* PC: 표 */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-[0.9375rem] tabular-nums">
                <thead className="text-left text-muted">
                  <tr className="border-b border-line">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      프로젝트
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      최근 7일
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      최근 30일
                    </th>
                    <th scope="col" className="py-2 pl-3 text-right font-medium">
                      전체
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-b border-line last:border-0">
                      <th scope="row" className="py-3 pr-3 text-left font-semibold">
                        <Link href={`/admin?project=${project.id}`} className="hover:text-accent-ink">
                          {project.title}
                        </Link>
                        {project.isPublished ? null : (
                          <span className="ml-2 rounded-md bg-surface-2 px-1.5 py-0.5 text-[0.8125rem] font-medium text-muted">
                            비공개
                          </span>
                        )}
                      </th>
                      <td className="px-3 py-3 text-right">{number(project.last7)}</td>
                      <td className="px-3 py-3 text-right">{number(project.last30)}</td>
                      <td className="py-3 pl-3 text-right font-semibold">{number(project.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일: 카드 */}
            <ul className="space-y-3 md:hidden">
              {projects.map((project) => (
                <li key={project.id} className="rounded-lg border border-line p-3">
                  <p className="font-semibold">
                    <Link href={`/admin?project=${project.id}`}>{project.title}</Link>
                    {project.isPublished ? null : (
                      <span className="ml-2 rounded-md bg-surface-2 px-1.5 py-0.5 text-[0.8125rem] font-medium text-muted">
                        비공개
                      </span>
                    )}
                  </p>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-center tabular-nums">
                    {(
                      [
                        ["최근 7일", project.last7],
                        ["최근 30일", project.last30],
                        ["전체", project.total],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label} className="rounded-md bg-surface-2 px-2 py-2">
                        <dt className="text-[0.8125rem] text-muted">{label}</dt>
                        <dd className="text-lg font-bold">{number(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-4">
          <Link href="/admin/views" className="inline-flex min-h-11 items-center font-medium text-accent-ink">
            조회 기록 전체 보기 →
          </Link>
        </p>
      </Panel>

      <ContentStatsPanel stats={content} />
    </div>
  );
}

function StatTile({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 md:p-5">
      <p className="text-[0.9375rem] font-medium text-muted">{label}</p>
      <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
        {number(value)}
        <span className="ml-1 text-lg font-semibold text-muted">회</span>
      </p>
      <p className="mt-1 text-sm text-muted">{note}</p>
    </div>
  );
}
