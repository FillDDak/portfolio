import "server-only";
import { readdir, readFile, realpath, stat, statfs } from "node:fs/promises";
import os from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { getEnv } from "@/lib/env";
import {
  formatReleaseId,
  parseBackupStatus,
  parseCgroupLimit,
  parseCgroupPath,
  parseMeminfo,
  parseRevision,
  type BackupStatus,
} from "./parse";

export type ServerInfo = {
  checkedAt: Date;
  deploy: {
    /** 커밋 해시. 배포 묶음이 아니면(로컬 실행) null */
    revision: string | null;
    /** 배포 시각(서버 시간). 배포 폴더가 아니면 null */
    releasedAt: string | null;
    appStartedAt: Date;
    nodeVersion: string;
  };
  app: {
    rssBytes: number;
    /** systemd 가 이 앱에 건 메모리 제한(MemoryHigh/MemoryMax)과 현재 사용량. Linux 가 아니면 null */
    cgroup: { currentBytes: number; highBytes: number | null; maxBytes: number | null } | null;
  };
  system: {
    totalBytes: number;
    availableBytes: number;
    swapTotalBytes: number | null;
    swapFreeBytes: number | null;
    uptimeSeconds: number;
    load: [number, number, number];
    cpuCount: number;
  };
  disk: { totalBytes: number; freeBytes: number } | null;
  data: { dbBytes: number | null; uploadsBytes: number | null; uploadsCount: number | null };
  /** missing: 아직 백업 기록이 없음(또는 서버에 기록 기능이 적용되지 않음) */
  backup: BackupStatus | "missing" | "invalid";
};

async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(/* turbopackIgnore: true */ path, "utf8");
  } catch {
    return null;
  }
}

async function fileSize(path: string): Promise<number | null> {
  try {
    return (await stat(/* turbopackIgnore: true */ path)).size;
  } catch {
    return null;
  }
}

async function cgroupMemory(): Promise<ServerInfo["app"]["cgroup"]> {
  const self = await readText("/proc/self/cgroup");
  const path = self ? parseCgroupPath(self) : null;
  if (!path) return null;
  const base = join(/* turbopackIgnore: true */ "/sys/fs/cgroup", path);
  const current = parseCgroupLimit((await readText(join(/* turbopackIgnore: true */ base, "memory.current"))) ?? "");
  if (current === null) return null;
  return {
    currentBytes: current,
    highBytes: parseCgroupLimit((await readText(join(/* turbopackIgnore: true */ base, "memory.high"))) ?? ""),
    maxBytes: parseCgroupLimit((await readText(join(/* turbopackIgnore: true */ base, "memory.max"))) ?? ""),
  };
}

async function directorySize(dir: string): Promise<{ bytes: number; count: number } | null> {
  try {
    const entries = await readdir(/* turbopackIgnore: true */ dir, { withFileTypes: true, recursive: true });
    let bytes = 0;
    let count = 0;
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const size = await fileSize(join(/* turbopackIgnore: true */ entry.parentPath, entry.name));
      if (size === null) continue;
      bytes += size;
      count += 1;
    }
    return { bytes, count };
  } catch {
    return null;
  }
}

/**
 * 관리자 '서버·배포' 화면에 보여 줄 값을 모은다. 값마다 실패해도 나머지는 보여 주도록 각각 따로 읽는다.
 *
 * - 커밋: 배포 묶음의 REVISION 파일(deploy/package-release.sh)
 * - 배포 시각: 실행 중인 버전 폴더 이름(/opt/portfolio/releases/20261119-140501)
 * - 백업: 백업 스크립트가 데이터 폴더에 남기는 backup-status.json(백업 폴더 자체는 앱이 읽을 수 없다)
 */
export async function getServerInfo(): Promise<ServerInfo> {
  const env = getEnv();
  const cwd = process.cwd();
  const releaseDir = await realpath(/* turbopackIgnore: true */ cwd).catch(() => cwd);
  const dbPath = resolve(/* turbopackIgnore: true */ cwd, env.DATABASE_URL.replace(/^file:/, ""));
  const uploadDir = resolve(/* turbopackIgnore: true */ cwd, env.UPLOAD_DIR);
  const backupStatusPath = join(/* turbopackIgnore: true */ dirname(uploadDir), "backup-status.json");

  const [revisionText, meminfoText, cgroup, disk, dbBytes, walBytes, uploads, backupText] =
    await Promise.all([
      readText(join(/* turbopackIgnore: true */ cwd, "REVISION")),
      readText("/proc/meminfo"),
      cgroupMemory(),
      statfs(/* turbopackIgnore: true */ dirname(dbPath))
        .then((info) => ({
          totalBytes: info.blocks * info.bsize,
          freeBytes: info.bavail * info.bsize,
        }))
        .catch(() => null),
      fileSize(dbPath),
      fileSize(`${dbPath}-wal`),
      directorySize(uploadDir),
      readText(backupStatusPath),
    ]);

  const meminfo = meminfoText ? parseMeminfo(meminfoText) : null;
  const backup = backupText === null ? "missing" : (parseBackupStatus(backupText) ?? "invalid");
  const load = os.loadavg() as [number, number, number];

  return {
    checkedAt: new Date(),
    deploy: {
      revision: revisionText ? parseRevision(revisionText) : null,
      releasedAt: formatReleaseId(basename(releaseDir)),
      appStartedAt: new Date(Date.now() - process.uptime() * 1000),
      nodeVersion: process.version,
    },
    app: { rssBytes: process.memoryUsage.rss(), cgroup },
    system: {
      totalBytes: meminfo?.totalBytes ?? os.totalmem(),
      availableBytes: meminfo?.availableBytes ?? os.freemem(),
      swapTotalBytes: meminfo ? meminfo.swapTotalBytes : null,
      swapFreeBytes: meminfo ? meminfo.swapFreeBytes : null,
      uptimeSeconds: os.uptime(),
      load,
      cpuCount: os.availableParallelism(),
    },
    disk,
    data: {
      dbBytes: dbBytes === null ? null : dbBytes + (walBytes ?? 0),
      uploadsBytes: uploads?.bytes ?? null,
      uploadsCount: uploads?.count ?? null,
    },
    backup,
  };
}
