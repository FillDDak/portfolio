import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// 서버 전용 표시 모듈은 테스트 환경에서 비워 둔다.
vi.mock("server-only", () => ({}));

/**
 * 보관 기간이 지난 조회 기록 삭제.
 * 삭제 조건이 실제 DB 에서 맞게 동작하는지 봐야 해서, 임시 SQLite 파일에 마이그레이션을 적용해 놓고 확인한다.
 */
describe("purgeOldPageViews", () => {
  const dir = mkdtempSync(join(tmpdir(), "portfolio-purge-"));
  const databaseUrl = `file:${join(dir, "test.db").replaceAll("\\", "/")}`;
  const DAY = 86_400_000;
  const now = new Date("2026-11-17T03:00:00.000Z");

  let db: typeof import("@/lib/db").db;
  let purgeOldPageViews: typeof import("@/lib/analytics/record").purgeOldPageViews;

  beforeAll(async () => {
    Object.assign(process.env, {
      DATABASE_URL: databaseUrl,
      UPLOAD_DIR: dir,
      SITE_URL: "http://localhost:3000",
      SESSION_SECRET: "unit-test-session-secret-0123456789abcdef",
      ANALYTICS_SECRET: "unit-test-analytics-secret-0123456789abcdef",
      PAGEVIEW_RETENTION_DAYS: "180",
    });
    const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
      env: process.env,
      shell: true,
      encoding: "utf8",
    });
    if (migrate.status !== 0) throw new Error(`마이그레이션 실패:\n${migrate.stdout}\n${migrate.stderr}`);

    const { resetEnvCache } = await import("@/lib/env");
    resetEnvCache();
    ({ db } = await import("@/lib/db"));
    ({ purgeOldPageViews } = await import("@/lib/analytics/record"));
  }, 60_000);

  afterAll(async () => {
    await db?.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  });

  const view = (label: string, ageMs: number) => ({
    path: "/",
    visitorHash: label,
    device: "desktop",
    createdAt: new Date(now.getTime() - ageMs),
  });

  it("180일이 지난 상세 기록만 지우고 일별 합계는 남긴다", async () => {
    await db.pageView.createMany({
      data: [
        view("오늘", 0),
        view("179일 전", 179 * DAY),
        view("180일에서 1초 모자람", 180 * DAY - 1000),
        view("정확히 180일", 180 * DAY),
        view("180일에서 1초 지남", 180 * DAY + 1000),
        view("1년 전", 365 * DAY),
      ],
    });
    await db.dailyStat.create({ data: { date: "2025-11-17", path: "/", views: 7, visitors: 5 } });

    expect(await purgeOldPageViews(now)).toBe(2);

    const left = await db.pageView.findMany({ orderBy: { createdAt: "desc" } });
    expect(left.map((row) => row.visitorHash)).toEqual([
      "오늘",
      "179일 전",
      "180일에서 1초 모자람",
      "정확히 180일",
    ]);
    // 오래된 날의 합계는 그대로 남아 전체 조회수 계산에 계속 쓰인다.
    expect(await db.dailyStat.findMany()).toMatchObject([
      { date: "2025-11-17", path: "/", views: 7, visitors: 5 },
    ]);
  });

  it("지울 것이 없으면 0 을 돌려준다", async () => {
    expect(await purgeOldPageViews(now)).toBe(0);
  });

  it("보관 일수 설정을 따른다", async () => {
    const { resetEnvCache } = await import("@/lib/env");
    process.env.PAGEVIEW_RETENTION_DAYS = "30";
    resetEnvCache();
    try {
      // 남아 있는 4건 중 30일이 지난 3건(179일, 180일 근처 2건)이 지워진다.
      expect(await purgeOldPageViews(now)).toBe(3);
      expect(await db.pageView.count()).toBe(1);
    } finally {
      process.env.PAGEVIEW_RETENTION_DAYS = "180";
      resetEnvCache();
    }
  });
});
