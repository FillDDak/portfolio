/** 서버·배포 정보 화면에서 쓰는 파일 내용 해석. 파일을 읽는 쪽(index.ts)과 나눠 테스트하기 쉽게 한다. */

export type MemInfo = {
  totalBytes: number;
  availableBytes: number;
  swapTotalBytes: number;
  swapFreeBytes: number;
};

/** /proc/meminfo 에서 필요한 값만 읽는다. 값은 kB 단위로 적혀 있다. */
export function parseMeminfo(text: string): MemInfo | null {
  const values = new Map<string, number>();
  for (const line of text.split("\n")) {
    const match = /^(\w+):\s+(\d+)\s*kB/.exec(line);
    if (match) values.set(match[1]!, Number(match[2]) * 1024);
  }
  const total = values.get("MemTotal");
  const available = values.get("MemAvailable");
  if (total === undefined || available === undefined) return null;
  return {
    totalBytes: total,
    availableBytes: available,
    swapTotalBytes: values.get("SwapTotal") ?? 0,
    swapFreeBytes: values.get("SwapFree") ?? 0,
  };
}

/** /proc/self/cgroup(cgroup v2 의 "0::/system.slice/portfolio.service")에서 이 프로세스의 cgroup 경로 */
export function parseCgroupPath(text: string): string | null {
  for (const line of text.split("\n")) {
    if (line.startsWith("0::")) {
      const path = line.slice(3).trim();
      // 경로를 그대로 파일 경로에 붙이므로 상위 폴더로 벗어나는 값은 받지 않는다.
      return path.startsWith("/") && !path.includes("..") ? path : null;
    }
  }
  return null;
}

/** memory.max / memory.high 값. 제한이 없으면 "max" 라고 적혀 있다. */
export function parseCgroupLimit(text: string): number | null {
  const value = text.trim();
  return /^\d+$/.test(value) ? Number(value) : null;
}

/**
 * 배포 스크립트가 만드는 버전 폴더 이름(서버 시간 기준 "20261119-140501")을 "2026-11-19 14:05:01" 로 바꾼다.
 * 형식이 다르면 null.
 */
export function formatReleaseId(id: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(id);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}

/** 커밋 해시(REVISION 파일). 40자 16진수가 아니면 보여 주지 않는다. */
export function parseRevision(text: string): string | null {
  const value = text.trim();
  return /^[0-9a-f]{40}$/.test(value) ? value : null;
}

export type BackupStatus = {
  ok: boolean;
  finishedAt: Date;
  label: string;
  /** 이번 백업 파일 크기(DB + 업로드) */
  bytes: number;
  /** 백업 폴더 전체 크기와 파일 수 */
  totalBytes: number;
  fileCount: number;
};

/** 백업 스크립트가 남기는 backup-status.json. 형식이 맞지 않으면 null. */
export function parseBackupStatus(text: string): BackupStatus | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const finishedAt = typeof value.finishedAt === "string" ? new Date(value.finishedAt) : null;
  const number = (key: string) =>
    typeof value[key] === "number" && Number.isFinite(value[key]) && (value[key] as number) >= 0
      ? (value[key] as number)
      : null;
  const bytes = number("bytes");
  const totalBytes = number("totalBytes");
  const fileCount = number("fileCount");
  if (
    typeof value.ok !== "boolean" ||
    !finishedAt ||
    Number.isNaN(finishedAt.getTime()) ||
    typeof value.label !== "string" ||
    bytes === null ||
    totalBytes === null ||
    fileCount === null
  ) {
    return null;
  }
  return { ok: value.ok, finishedAt, label: value.label, bytes, totalBytes, fileCount };
}

/** 1536 → "1.5 KB". 1000 이 아니라 1024 단위로 센다(서버 도구들과 같은 기준). */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

/** 초 → "3일 4시간", "2시간 5분", "7분" */
export function formatUptime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return hours > 0 ? `${days}일 ${hours}시간` : `${days}일`;
  if (hours > 0) return rest > 0 ? `${hours}시간 ${rest}분` : `${hours}시간`;
  return `${Math.max(rest, 0)}분`;
}
