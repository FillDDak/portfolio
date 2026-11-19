import "server-only";
import { spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";

const fileNameTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 내려받을 파일 이름. 한국 시간 기준 portfolio-backup-20261119-1430.tar.gz */
export function backupFileName(now: Date): string {
  const parts = Object.fromEntries(fileNameTime.formatToParts(now).map((part) => [part.type, part.value]));
  return `portfolio-backup-${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}.tar.gz`;
}

function runTar(args: string[], cwd: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("tar", args, { cwd, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`tar 종료 코드 ${code}: ${stderr.trim()}`)),
    );
  });
}

export type BackupArchive = { path: string; size: number; cleanup: () => Promise<void> };

/**
 * 지금 시점의 백업 묶음(tar.gz)을 임시 폴더에 만든다.
 *   portfolio.db  DB 사본. VACUUM INTO 는 앱을 멈추지 않고 일관된 상태로 복사한다(쓰는 중인 DB 도 안전).
 *   uploads/      업로드한 이미지와 PDF
 * 다 보낸 뒤에는 반드시 cleanup() 으로 임시 폴더를 지운다.
 */
export async function createBackupArchive(): Promise<BackupArchive> {
  const env = getEnv();
  const work = await mkdtemp(/* turbopackIgnore: true */ join(tmpdir(), "portfolio-backup-"));
  const cleanup = () => rm(/* turbopackIgnore: true */ work, { recursive: true, force: true });

  try {
    const dbCopy = join(/* turbopackIgnore: true */ work, "portfolio.db");
    // 경로는 직접 만든 임시 경로라 사용자 입력이 섞이지 않는다. 작은따옴표만 SQL 규칙대로 두 번 쓴다.
    await db.$executeRawUnsafe(`VACUUM INTO '${dbCopy.replaceAll("'", "''")}'`);

    const archive = "backup.tar.gz";
    const args = ["-czf", archive, "portfolio.db"];
    const uploadDir = resolve(/* turbopackIgnore: true */ process.cwd(), env.UPLOAD_DIR);
    const hasUploads = await stat(/* turbopackIgnore: true */ uploadDir)
      .then((info) => info.isDirectory())
      .catch(() => false);
    // 업로드 폴더는 이름을 uploads 로 맞춰 넣는다(폴더 위치만 -C 로 바꾼다).
    if (hasUploads) args.push("-C", dirname(uploadDir), basename(uploadDir));
    await runTar(args, work);

    const path = join(/* turbopackIgnore: true */ work, archive);
    return { path, size: (await stat(/* turbopackIgnore: true */ path)).size, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
