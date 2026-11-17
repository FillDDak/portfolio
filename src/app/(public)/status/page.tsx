import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AlertCircleIcon, CheckCircleIcon } from "@/components/icons";
import { getActiveMonitors } from "@/lib/data/public";
import { displayUrl, formatDateTime } from "@/lib/format";
import { getSharedStatusChecker, type CheckResult } from "@/lib/status/check";

export const metadata: Metadata = {
  title: "서비스 상태",
  description: "운영 중인 서비스가 정상적으로 응답하는지 확인한 결과입니다.",
  alternates: { canonical: "/status" },
};

type Monitor = Awaited<ReturnType<typeof getActiveMonitors>>[number];

export default async function StatusPage() {
  const monitors = await getActiveMonitors();
  // 표시할 주소가 없는 동안에는 이 페이지 자체가 없는 것으로 처리한다.
  if (monitors.length === 0) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 pb-16 md:px-8 md:pt-12">
      <h1 className="text-[1.875rem] leading-tight font-bold tracking-tight md:text-[2.25rem]">
        서비스 상태
      </h1>
      <p className="mt-2 text-muted">운영 중인 서비스가 지금 응답하는지 확인한 결과입니다.</p>

      {/* 이름과 주소는 바로 보여 주고, 확인 결과는 요청 시점에 채운다. */}
      <Suspense fallback={<StatusBoard monitors={monitors} results={null} />}>
        <CheckedStatusBoard monitors={monitors} />
      </Suspense>
    </div>
  );
}

async function CheckedStatusBoard({ monitors }: { monitors: Monitor[] }) {
  await connection();
  const checker = getSharedStatusChecker();
  const results = await Promise.all(monitors.map((monitor) => checker.check(monitor.url)));
  return <StatusBoard monitors={monitors} results={results} />;
}

function StatusBoard({
  monitors,
  results,
}: {
  monitors: Monitor[];
  results: CheckResult[] | null;
}) {
  const downCount = results ? results.filter((result) => result.state === "down").length : 0;
  // 주소마다 확인한 시각이 다를 수 있어서 가장 오래된 시각을 보여 준다.
  const checkedAt = results ? Math.min(...results.map((result) => result.checkedAt)) : null;

  return (
    <>
      <div
        className={`mt-8 flex items-center gap-3 rounded-xl border px-5 py-4 ${
          !results
            ? "border-line bg-surface text-muted"
            : downCount > 0
              ? "border-danger/30 bg-danger-soft text-danger"
              : "border-success/30 bg-success-soft text-success"
        }`}
      >
        {results ? (
          downCount > 0 ? (
            <AlertCircleIcon width={24} height={24} className="shrink-0" />
          ) : (
            <CheckCircleIcon width={24} height={24} className="shrink-0" />
          )
        ) : null}
        <p className="text-lg font-semibold">
          {!results
            ? "상태를 확인하는 중입니다…"
            : downCount === 0
              ? "모든 서비스가 정상입니다"
              : `${monitors.length}개 중 ${downCount}개 서비스에 문제가 있습니다`}
        </p>
      </div>

      <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
        {monitors.map((monitor, index) => {
          const result = results?.[index] ?? null;
          return (
            <li
              key={monitor.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{monitor.name}</h2>
                <a
                  href={monitor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="-my-2.5 inline-flex min-h-11 max-w-full items-center font-mono text-sm text-muted hover:text-foreground"
                >
                  <span className="truncate">{displayUrl(monitor.url)}</span>
                </a>
                {result?.reason ? <p className="text-sm text-danger">{result.reason}</p> : null}
              </div>
              {/* 좁은 화면에서는 상태 아래에 응답 시간을 둔다. */}
              <div className="flex shrink-0 flex-col-reverse items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                {result?.responseMs != null ? (
                  <span className="font-mono text-sm text-muted">
                    <span className="sr-only">응답 시간 </span>
                    {result.responseMs.toLocaleString("ko-KR")}ms
                  </span>
                ) : null}
                <StateBadge state={result?.state ?? null} />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-sm text-muted">
        {checkedAt ? `${formatDateTime(new Date(checkedAt))} 확인. ` : null}
        확인 결과는 1분 동안 유지되므로 최대 1분 전 상태일 수 있습니다.
      </p>
    </>
  );
}

function StateBadge({ state }: { state: CheckResult["state"] | null }) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold";
  if (state === "up") {
    return (
      <span className={`${base} bg-success-soft text-success`}>
        <CheckCircleIcon width={16} height={16} />
        정상
      </span>
    );
  }
  if (state === "down") {
    return (
      <span className={`${base} bg-danger-soft text-danger`}>
        <AlertCircleIcon width={16} height={16} />
        오류
      </span>
    );
  }
  return <span className={`${base} bg-surface-2 text-muted`}>확인 중</span>;
}
