import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { RefreshButton } from "@/components/admin/refresh-button";
import { requireAdmin } from "@/lib/auth/guard";
import { formatDateTime } from "@/lib/format";
import { getServerInfo } from "@/lib/server-info";
import { formatBytes, formatUptime } from "@/lib/server-info/parse";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다(layout.tsx 설명 참고).
export const instant = false;

export const metadata: Metadata = { title: "서버·배포" };

const REPOSITORY_URL = "https://github.com/FillDDak/portfolio";
/** 매일 04:30 에 백업하므로, 마지막 백업이 이보다 오래되면 백업이 멈춘 것으로 본다. */
const BACKUP_STALE_HOURS = 26;

export default async function ServerInfoPage() {
  await requireAdmin();
  const info = await getServerInfo();
  const { deploy, app, system, disk, data, backup } = info;

  const appLimit = app.cgroup?.maxBytes ?? null;
  const appUsed = app.cgroup?.currentBytes ?? app.rssBytes;
  const appOverHigh = app.cgroup?.highBytes != null && app.cgroup.currentBytes >= app.cgroup.highBytes;
  const systemUsed = system.totalBytes - system.availableBytes;
  const swapUsed =
    system.swapTotalBytes != null && system.swapFreeBytes != null
      ? system.swapTotalBytes - system.swapFreeBytes
      : null;
  const diskUsed = disk ? disk.totalBytes - disk.freeBytes : null;

  const backupAgeHours =
    typeof backup === "object" ? (info.checkedAt.getTime() - backup.finishedAt.getTime()) / 3_600_000 : null;
  const backupProblem =
    typeof backup === "object" && (!backup.ok || (backupAgeHours ?? 0) > BACKUP_STALE_HOURS);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="서버·배포"
        description={`지금 실행 중인 버전과 서버 자원, 백업 상태입니다. ${formatDateTime(info.checkedAt)} 기준.`}
        action={<RefreshButton />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="배포">
          <Rows>
            <Row label="커밋">
              {deploy.revision ? (
                <a
                  href={`${REPOSITORY_URL}/commit/${deploy.revision}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={deploy.revision}
                  className="font-mono text-accent-ink underline underline-offset-2"
                >
                  {deploy.revision.slice(0, 7)}
                </a>
              ) : (
                <Muted>정보 없음 (배포 묶음이 아닌 로컬 실행)</Muted>
              )}
            </Row>
            <Row label="배포 시각">{deploy.releasedAt ?? <Muted>정보 없음</Muted>}</Row>
            <Row label="앱 시작">
              {formatDateTime(deploy.appStartedAt)}{" "}
              <Muted>({formatUptime((info.checkedAt.getTime() - deploy.appStartedAt.getTime()) / 1000)} 전)</Muted>
            </Row>
            <Row label="서버 가동">{formatUptime(system.uptimeSeconds)}</Row>
            <Row label="Node.js">{deploy.nodeVersion}</Row>
          </Rows>
        </Panel>

        <Panel title="메모리">
          <Meter
            label="앱"
            used={appUsed}
            total={appLimit}
            danger={appOverHigh}
            note={
              appLimit
                ? `한도 ${formatBytes(appLimit)}${app.cgroup?.highBytes ? `, ${formatBytes(app.cgroup.highBytes)} 넘으면 회수 시작` : ""}`
                : "한도 정보 없음 (systemd 밖에서 실행)"
            }
          />
          <Meter
            label="서버 전체"
            used={systemUsed}
            total={system.totalBytes}
            danger={system.availableBytes / system.totalBytes < 0.1}
            note={`사용 가능 ${formatBytes(system.availableBytes)}`}
          />
          {swapUsed !== null && system.swapTotalBytes ? (
            <Meter label="스왑" used={swapUsed} total={system.swapTotalBytes} danger={false} />
          ) : null}
          <p className="mt-1 text-sm text-muted">
            평균 부하(1·5·15분) {system.load.map((value) => value.toFixed(2)).join(" · ")} · CPU {system.cpuCount}개
          </p>
        </Panel>

        <Panel title="디스크·데이터">
          {disk && diskUsed !== null ? (
            <Meter
              label="디스크"
              used={diskUsed}
              total={disk.totalBytes}
              danger={disk.freeBytes / disk.totalBytes < 0.15}
              note={`남은 용량 ${formatBytes(disk.freeBytes)}`}
            />
          ) : (
            <p className="mb-3 text-muted">디스크 정보를 읽지 못했습니다.</p>
          )}
          <Rows>
            <Row label="DB">{data.dbBytes === null ? <Muted>읽지 못함</Muted> : formatBytes(data.dbBytes)}</Row>
            <Row label="업로드 파일">
              {data.uploadsBytes === null ? (
                <Muted>읽지 못함</Muted>
              ) : (
                `${formatBytes(data.uploadsBytes)} · ${data.uploadsCount?.toLocaleString("ko-KR")}개`
              )}
            </Row>
          </Rows>
        </Panel>

        <Panel title="백업">
          {typeof backup === "object" ? (
            <>
              <p
                className={`mb-3 rounded-lg px-3 py-2 font-semibold ${
                  backupProblem ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
                }`}
              >
                {!backup.ok
                  ? "마지막 백업이 실패했습니다"
                  : backupProblem
                    ? `마지막 백업이 ${Math.floor(backupAgeHours ?? 0)}시간 전입니다`
                    : "정상"}
              </p>
              <Rows>
                <Row label="마지막 백업">
                  {formatDateTime(backup.finishedAt)}{" "}
                  <Muted>
                    ({backup.label === "pre-deploy" ? "배포 직전" : backup.label === "daily" ? "매일" : backup.label})
                  </Muted>
                </Row>
                <Row label="이번 백업 크기">{formatBytes(backup.bytes)}</Row>
                <Row label="보관 중">
                  {formatBytes(backup.totalBytes)} · {backup.fileCount.toLocaleString("ko-KR")}개 파일
                </Row>
              </Rows>
              <p className="mt-3 text-sm text-muted">매일 04:30과 배포 직전에 백업하고, 14일이 지난 백업은 지웁니다.</p>
            </>
          ) : (
            <p className="text-muted">
              {backup === "invalid"
                ? "백업 기록 파일의 형식이 올바르지 않습니다."
                : "백업 기록이 아직 없습니다. 서버의 백업 스크립트가 다음에 실행되면 여기에 표시됩니다."}
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <dl className="space-y-2">{children}</dl>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-3">
      <dt className="w-24 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 tabular-nums">{children}</dd>
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-muted">{children}</span>;
}

/** 사용량 막대. total 을 모르면 사용량만 보여 준다. */
function Meter({
  label,
  used,
  total,
  danger,
  note,
}: {
  label: string;
  used: number;
  total: number | null;
  danger: boolean;
  note?: string;
}) {
  const ratio = total ? Math.min(1, Math.max(0, used / total)) : null;
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">
          {formatBytes(used)}
          {total ? <span className="text-muted"> / {formatBytes(total)}</span> : null}
          {ratio !== null ? (
            <span className={`ml-2 font-semibold ${danger ? "text-danger" : ""}`}>{Math.round(ratio * 100)}%</span>
          ) : null}
        </span>
      </div>
      {ratio !== null ? (
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2"
          role="meter"
          aria-label={`${label} 사용량`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
        >
          <div
            className={`h-full rounded-full ${danger ? "bg-danger" : "bg-accent"}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      ) : null}
      {note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
    </div>
  );
}
