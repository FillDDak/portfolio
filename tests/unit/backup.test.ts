import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

const { backupFileName } = await import("@/lib/backup/archive");

describe("백업 파일 이름", () => {
  it("한국 시간 기준 날짜와 시각을 붙인다", () => {
    // UTC 2026-11-18 15:30 = 한국 시간 2026-11-19 00:30
    expect(backupFileName(new Date("2026-11-18T15:30:00Z"))).toBe("portfolio-backup-20261119-0030.tar.gz");
  });
});
