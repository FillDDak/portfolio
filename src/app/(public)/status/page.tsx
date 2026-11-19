import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AlertCircleIcon, ArrowUpRightIcon, CheckCircleIcon } from "@/components/icons";
import { getActiveMonitors } from "@/lib/data/public";
import { formatDateTime } from "@/lib/format";
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
      <p className="mt-2 text-muted">
        운영 중인 서비스가 지금 응답하는지 확인한 결과입니다. 결과는 1분 동안 유지되므로 최대 1분 전
        상태일 수 있습니다.
      </p>

      {/* 이름과 설명은 바로 보여 주고, 확인 결과는 요청 시점에 채운다. */}
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
            // 주소 글자는 보여 주지 않고, 상태 배지 옆 '방문' 버튼으로 그 서비스로 이동한다.
            <li key={monitor.id} className="px-5 py-3 md:px-6">
              <div className="flex items-center gap-2">
                <h2 className="min-w-0 flex-1 text-[1.0625rem] font-semibold">{monitor.name}</h2>
                <StateBadge state={result?.state ?? null} />
                {/* 눌리는 영역은 44px 를 유지하고, 보이는 버튼은 상태 배지와 같은 높이로 작게 둔다. */}
                <a
                  href={monitor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group -my-1.5 inline-flex min-h-11 shrink-0 items-center"
                >
                  <span className="inline-flex items-center gap-1 rounded-full border border-line-strong px-3 py-1 text-sm font-semibold transition-colors duration-150 group-hover:border-foreground/40 group-hover:bg-surface-2">
                    <span aria-hidden="true">방문</span>
                    <ArrowUpRightIcon width={14} height={14} className="shrink-0" />
                  </span>
                  <span className="sr-only">{monitor.name} 사이트 방문 (새 탭에서 열림)</span>
                </a>
              </div>
              {monitor.description || result?.responseMs != null ? (
                <p className="flex flex-wrap gap-x-3 text-[0.9375rem] text-muted">
                  {monitor.description ? <span>{monitor.description}</span> : null}
                  {!result?.reason && result?.responseMs != null ? (
                    <span className="text-sm leading-[inherit]">
                      응답 <span className="font-mono">{result.responseMs.toLocaleString("ko-KR")}ms</span>
                    </span>
                  ) : null}
                </p>
              ) : null}
              {result?.reason ? (
                <p className="mt-0.5 text-sm font-medium text-danger">{result.reason}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {checkedAt ? (
        <p className="mt-4 text-sm text-muted">{formatDateTime(new Date(checkedAt))} 확인</p>
      ) : null}
    </>
  );
}

function StateBadge({ state }: { state: CheckResult["state"] | null }) {
  const base = "inline-flex shrink-0 items-center gap-1 rounded-full border border-transparent px-2.5 py-1 text-sm font-semibold";
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
