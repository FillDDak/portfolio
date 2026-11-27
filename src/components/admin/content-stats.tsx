import type { ContentStats } from "@/lib/analytics/stats";
import { Panel } from "./page-header";

const number = (value: number) => value.toLocaleString("ko-KR");
const percent = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–");

const SECTION_LABELS: Record<ContentStats["sections"][number]["id"], string> = {
  projects: "프로젝트",
  experience: "경험",
  skills: "스킬",
  certificates: "자격증",
  contact: "문의",
};
const PROFILE_LABELS: Record<ContentStats["profileLinks"][number]["key"], string> = {
  github: "GitHub",
  blog: "Blog",
  velog: "Velog",
  notion: "Notion",
};

/**
 * 콘텐츠 반응: 홈에서 어디까지 내려오는지, 무엇을 누르는지.
 * 모든 숫자는 '탭 세션당 1번'으로 센 합계라서, 새로고침이나 반복 클릭으로 부풀지 않는다.
 */
export function ContentStatsPanel({ stats }: { stats: ContentStats }) {
  const projectsReach = stats.sections.find((section) => section.id === "projects")?.count ?? 0;

  return (
    <Panel title={`콘텐츠 반응 · 최근 ${stats.days}일`} className="mt-5">
      <p className="-mt-1 mb-5 text-sm text-muted">
        방문(탭)마다 한 번씩만 센 합계입니다. 날짜별 횟수만 저장하고 방문자 정보는 남기지 않습니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="reach-heading">
          <h3 id="reach-heading" className="font-semibold">
            홈에서 어디까지 보나
          </h3>
          {stats.home === 0 ? (
            <p className="mt-2 text-[0.9375rem] text-muted">아직 기록이 없습니다.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              <ReachRow label="홈 방문" count={stats.home} base={stats.home} />
              {stats.sections.map((section) => (
                <ReachRow
                  key={section.id}
                  label={`${SECTION_LABELS[section.id]} 섹션`}
                  count={section.count}
                  base={stats.home}
                />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="actions-heading">
          <h3 id="actions-heading" className="font-semibold">
            문의 · PDF · 외부 프로필
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Metric
              label="문의 작성 시작"
              value={stats.contact.start}
              note={stats.home > 0 ? `홈 방문의 ${percent(stats.contact.start, stats.home)}` : undefined}
            />
            <Metric
              label="문의 전송"
              value={stats.contact.sent}
              note={stats.contact.start > 0 ? `작성 시작의 ${percent(stats.contact.sent, stats.contact.start)}` : undefined}
            />
            <Metric label="PDF 열람" value={stats.pdf.view} />
            <Metric label="PDF 다운로드" value={stats.pdf.download} />
            {stats.profileLinks.map((link) => (
              <Metric key={link.key} label={`${PROFILE_LABELS[link.key]} 클릭`} value={link.count} />
            ))}
          </dl>
        </section>
      </div>

      <section aria-labelledby="project-reaction-heading" className="mt-7">
        <h3 id="project-reaction-heading" className="font-semibold">
          프로젝트별 반응
        </h3>
        <p className="mt-0.5 text-sm text-muted">
          카드 클릭률은 프로젝트 섹션까지 내려온 방문({number(projectsReach)}) 중 카드를 누른 비율입니다. 위쪽 카드일수록
          높게 나오는 경향이 있습니다.
        </p>
        {stats.projects.length === 0 ? (
          <p className="mt-2 text-[0.9375rem] text-muted">공개 중인 프로젝트가 없습니다.</p>
        ) : (
          <>
            {/* PC: 표 */}
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full text-[0.9375rem] tabular-nums">
                <thead className="text-left text-muted">
                  <tr className="border-b border-line">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      프로젝트
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      카드 클릭
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      상세 조회
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      데모
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      GitHub
                    </th>
                    <th scope="col" className="py-2 pl-3 text-right font-medium">
                      API 문서
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.projects.map((project) => (
                    <tr key={project.id} className="border-b border-line last:border-0">
                      <th scope="row" className="py-3 pr-3 text-left font-semibold">
                        {project.title}
                      </th>
                      <td className="px-3 py-3 text-right">
                        <span className="font-semibold">{number(project.cardClicks)}</span>
                        <span className="ml-1.5 text-muted">({percent(project.cardClicks, projectsReach)})</span>
                      </td>
                      <td className="px-3 py-3 text-right">{number(project.detailViews)}</td>
                      <td className="px-3 py-3 text-right">{number(project.links.demo)}</td>
                      <td className="px-3 py-3 text-right">{number(project.links.github)}</td>
                      <td className="py-3 pl-3 text-right">{number(project.links.docs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일: 카드 */}
            <ul className="mt-3 space-y-3 md:hidden">
              {stats.projects.map((project) => (
                <li key={project.id} className="rounded-lg border border-line p-3">
                  <p className="font-semibold">{project.title}</p>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-center tabular-nums">
                    {(
                      [
                        ["카드 클릭", `${number(project.cardClicks)} (${percent(project.cardClicks, projectsReach)})`],
                        ["상세 조회", number(project.detailViews)],
                        ["GitHub", number(project.links.github)],
                        ["데모", number(project.links.demo)],
                        ["API 문서", number(project.links.docs)],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label} className="rounded-md bg-surface-2 px-2 py-2">
                        <dt className="text-[0.8125rem] text-muted">{label}</dt>
                        <dd className="font-bold">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </Panel>
  );
}

function ReachRow({ label, count, base }: { label: string; count: number; base: number }) {
  const ratio = base > 0 ? Math.min(1, count / base) : 0;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-[0.9375rem]">
        <span>{label}</span>
        <span className="tabular-nums">
          <span className="font-semibold">{number(count)}</span>
          <span className="ml-1.5 text-muted">{percent(count, base)}</span>
        </span>
      </div>
      <div aria-hidden="true" className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${ratio * 100}%` }} />
      </div>
    </li>
  );
}

function Metric({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5">
      <dt className="text-[0.8125rem] text-muted">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{number(value)}</dd>
      {note ? <dd className="text-[0.8125rem] text-muted">{note}</dd> : null}
    </div>
  );
}
