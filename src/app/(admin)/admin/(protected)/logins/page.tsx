import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { RefreshButton } from "@/components/admin/refresh-button";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { LOGIN_HISTORY_RETENTION_DAYS } from "@/lib/login-history";
import { describeUserAgent, formatLocation } from "@/lib/login-history/parse";
import { getClientIp } from "@/lib/request-ip";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다(layout.tsx 설명 참고).
export const instant = false;

export const metadata: Metadata = { title: "로그인 기록" };

const PAGE_SIZE = 50;

/** 지금부터 몇 시간 전 시각 */
function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

type Row = {
  id: number;
  createdAt: Date;
  result: string;
  ip: string;
  userAgent: string;
  country: string;
  region: string;
  city: string;
  isp: string;
  geoStatus: string;
};

const RESULT_LABEL: Record<string, { label: string; className: string }> = {
  SUCCESS: { label: "성공", className: "bg-success-soft text-success" },
  FAILURE: { label: "실패", className: "bg-danger-soft text-danger" },
  LOCKED: { label: "잠김", className: "bg-danger text-white" },
};

export default async function LoginHistoryPage({ searchParams }: PageProps<"/admin/logins">) {
  await requireAdmin();
  const params = await searchParams;
  const failedOnly = params.filter === "failed";
  const pageNumber = Number(typeof params.page === "string" ? params.page : "1");
  const page = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const where = failedOnly ? { result: { not: "SUCCESS" } } : {};
  const dayAgo = hoursAgo(24);

  const [count, rows, lastSuccess, recentFailures, recentLocks] = await Promise.all([
    db.loginAttempt.count({ where }),
    db.loginAttempt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.loginAttempt.findFirst({ where: { result: "SUCCESS" }, orderBy: { createdAt: "desc" } }),
    db.loginAttempt.count({ where: { result: "FAILURE", createdAt: { gte: dayAgo } } }),
    db.loginAttempt.count({ where: { result: "LOCKED", createdAt: { gte: dayAgo } } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const currentIp = getClientIp(await headers(), getEnv().TRUSTED_PROXY_HOPS);
  const href = (next: { page?: number; failed?: boolean }) => {
    const query = new URLSearchParams();
    if (next.failed ?? failedOnly) query.set("filter", "failed");
    if (next.page && next.page > 1) query.set("page", String(next.page));
    const text = query.toString();
    return text ? `/admin/logins?${text}` : "/admin/logins";
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="로그인 기록"
        description={`최근 ${LOGIN_HISTORY_RETENTION_DAYS}일 동안의 관리자 로그인 시도입니다. 위치는 IP 로 추정한 값이라 실제와 다를 수 있습니다(특히 휴대폰 데이터는 통신사 위치로 나옵니다).`}
        action={<RefreshButton />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="마지막 로그인 성공">
          {lastSuccess ? (
            <>
              <p className="mt-1 text-lg font-bold tabular-nums">{formatDateTime(lastSuccess.createdAt)}</p>
              <p className="mt-0.5 text-sm text-muted">
                {locationText(lastSuccess)} · <span className="font-mono">{lastSuccess.ip}</span>
              </p>
            </>
          ) : (
            <p className="mt-1 text-lg font-bold text-muted">기록 없음</p>
          )}
        </Tile>
        <Tile label="최근 24시간 실패">
          <p className={`mt-1 text-3xl font-bold tabular-nums ${recentFailures > 0 ? "text-danger" : ""}`}>
            {recentFailures.toLocaleString("ko-KR")}
            <span className="ml-1 text-base font-semibold text-muted">회</span>
          </p>
        </Tile>
        <Tile label="최근 24시간 잠김">
          <p className={`mt-1 text-3xl font-bold tabular-nums ${recentLocks > 0 ? "text-danger" : ""}`}>
            {recentLocks.toLocaleString("ko-KR")}
            <span className="ml-1 text-base font-semibold text-muted">회</span>
          </p>
          <p className="mt-0.5 text-sm text-muted">같은 IP 에서 15분에 5번 틀리면 잠깁니다</p>
        </Tile>
      </div>

      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="보기" className="flex gap-1.5">
          <Link
            href={href({ failed: false })}
            aria-current={failedOnly ? undefined : "page"}
            className={buttonClass(failedOnly ? "ghost" : "secondary", "min-h-10")}
          >
            전체
          </Link>
          <Link
            href={href({ failed: true })}
            aria-current={failedOnly ? "page" : undefined}
            className={buttonClass(failedOnly ? "secondary" : "ghost", "min-h-10")}
          >
            실패·잠김만
          </Link>
        </nav>
        <p className="text-muted tabular-nums">
          {count.toLocaleString("ko-KR")}건{count > 0 ? ` · ${page} / ${pageCount} 쪽` : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState>{failedOnly ? "실패한 로그인 시도가 없습니다." : "로그인 기록이 없습니다."}</EmptyState>
      ) : (
        <>
          {/* PC: 표 */}
          <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-[0.9375rem]">
              <thead className="bg-surface-2 text-left">
                <tr>
                  {["시각", "결과", "IP", "위치", "기기"].map((heading) => (
                    <th key={heading} scope="col" className="px-4 py-2.5 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">{formatDateTime(row.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <ResultBadge result={row.result} />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <IpText ip={row.ip} current={row.ip === currentIp} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Location row={row} />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap" title={row.userAgent}>
                      {describeUserAgent(row.userAgent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일: 카드 */}
          <ul className="space-y-2.5 md:hidden">
            {rows.map((row) => (
              <li key={row.id} className="rounded-xl border border-line bg-surface p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <ResultBadge result={row.result} />
                  <span className="text-sm text-muted tabular-nums">{formatDateTime(row.createdAt)}</span>
                </div>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.9375rem]">
                  <dt className="text-muted">IP</dt>
                  <dd className="min-w-0 break-all">
                    <IpText ip={row.ip} current={row.ip === currentIp} />
                  </dd>
                  <dt className="text-muted">위치</dt>
                  <dd className="min-w-0">
                    <Location row={row} />
                  </dd>
                  <dt className="text-muted">기기</dt>
                  <dd>{describeUserAgent(row.userAgent)}</dd>
                </dl>
              </li>
            ))}
          </ul>

          <nav aria-label="쪽 이동" className="mt-4 flex items-center justify-between gap-2">
            {page > 1 ? (
              <Link href={href({ page: page - 1 })} className={buttonClass("secondary")}>
                ← 이전
              </Link>
            ) : (
              <span />
            )}
            {page < pageCount ? (
              <Link href={href({ page: page + 1 })} className={buttonClass("secondary")}>
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

function locationText(row: Pick<Row, "geoStatus" | "country" | "region" | "city">): string {
  if (row.geoStatus === "OK") return formatLocation(row);
  if (row.geoStatus === "PRIVATE") return "내부 주소";
  if (row.geoStatus === "PENDING") return "위치 조회 중";
  return "위치 알 수 없음";
}

function Location({ row }: { row: Row }) {
  return (
    <>
      <span className={row.geoStatus === "OK" ? "" : "text-muted"}>{locationText(row)}</span>
      {row.isp ? <span className="block text-sm text-muted">{row.isp}</span> : null}
    </>
  );
}

function IpText({ ip, current }: { ip: string; current: boolean }) {
  return (
    <>
      <span className="font-mono text-[0.875rem]">{ip}</span>
      {current ? (
        <span className="ml-2 rounded-md bg-accent-soft px-1.5 py-0.5 text-[0.75rem] font-semibold text-accent-ink">
          지금 접속한 IP
        </span>
      ) : null}
    </>
  );
}

function ResultBadge({ result }: { result: string }) {
  const style = RESULT_LABEL[result] ?? { label: result, className: "bg-surface-2 text-muted" };
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[0.8125rem] font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 md:p-5">
      <p className="text-[0.9375rem] font-medium text-muted">{label}</p>
      {children}
    </div>
  );
}
