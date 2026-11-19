import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatReleaseId,
  formatUptime,
  parseBackupStatus,
  parseCgroupLimit,
  parseCgroupPath,
  parseMeminfo,
  parseRevision,
} from "@/lib/server-info/parse";

describe("서버 정보 해석", () => {
  it("/proc/meminfo 에서 전체·사용 가능·스왑을 바이트로 읽는다", () => {
    const text = [
      "MemTotal:         976364 kB",
      "MemFree:          102400 kB",
      "MemAvailable:     512000 kB",
      "SwapTotal:       2097148 kB",
      "SwapFree:        2000000 kB",
    ].join("\n");
    expect(parseMeminfo(text)).toEqual({
      totalBytes: 976364 * 1024,
      availableBytes: 512000 * 1024,
      swapTotalBytes: 2097148 * 1024,
      swapFreeBytes: 2000000 * 1024,
    });
    expect(parseMeminfo("MemFree: 1 kB")).toBeNull();
  });

  it("cgroup v2 경로를 읽고, 상위 폴더로 벗어나는 값은 받지 않는다", () => {
    expect(parseCgroupPath("0::/system.slice/portfolio.service\n")).toBe("/system.slice/portfolio.service");
    expect(parseCgroupPath("0::/../../etc")).toBeNull();
    expect(parseCgroupPath("12:memory:/x")).toBeNull();
  });

  it("메모리 제한 값: 숫자면 바이트, max 면 제한 없음", () => {
    expect(parseCgroupLimit("471859200\n")).toBe(471859200);
    expect(parseCgroupLimit("max\n")).toBeNull();
  });

  it("버전 폴더 이름을 배포 시각으로 바꾼다", () => {
    expect(formatReleaseId("20261119-140501")).toBe("2026-11-19 14:05:01");
    expect(formatReleaseId("portfolio")).toBeNull();
  });

  it("커밋 해시는 40자 16진수만 받는다", () => {
    expect(parseRevision("14bf136a1b2c3d4e5f60718293a4b5c6d7e8f901\n")).toBe(
      "14bf136a1b2c3d4e5f60718293a4b5c6d7e8f901",
    );
    expect(parseRevision("unknown")).toBeNull();
  });

  it("백업 기록 파일을 읽고, 형식이 틀리면 null", () => {
    const status = parseBackupStatus(
      '{"ok":true,"finishedAt":"2026-11-19T04:30:12+09:00","label":"daily","bytes":20480,"totalBytes":409600,"fileCount":8}',
    );
    expect(status).toEqual({
      ok: true,
      finishedAt: new Date("2026-11-19T04:30:12+09:00"),
      label: "daily",
      bytes: 20480,
      totalBytes: 409600,
      fileCount: 8,
    });
    expect(parseBackupStatus("not json")).toBeNull();
    expect(parseBackupStatus('{"ok":true,"finishedAt":"어제","label":"daily","bytes":1,"totalBytes":1,"fileCount":1}')).toBeNull();
    expect(parseBackupStatus('{"ok":"yes","finishedAt":"2026-11-19T04:30:12+09:00","label":"daily","bytes":1,"totalBytes":1,"fileCount":1}')).toBeNull();
    expect(parseBackupStatus('{"ok":true,"finishedAt":"2026-11-19T04:30:12+09:00","label":"daily","bytes":-1,"totalBytes":1,"fileCount":1}')).toBeNull();
  });

  it("크기와 가동 시간을 읽기 좋게 표시한다", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(450 * 1024 * 1024)).toBe("450 MB");
    expect(formatBytes(45 * 1024 ** 3)).toBe("45.0 GB");
    expect(formatUptime(30)).toBe("0분");
    expect(formatUptime(7 * 60)).toBe("7분");
    expect(formatUptime(2 * 3600 + 5 * 60)).toBe("2시간 5분");
    expect(formatUptime(3 * 86400 + 4 * 3600)).toBe("3일 4시간");
  });
});
