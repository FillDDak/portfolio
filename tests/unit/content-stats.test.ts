import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// 서버 전용 표시 모듈은 테스트 환경에서 비워 둔다.
vi.mock("server-only", () => ({}));

/**
 * 콘텐츠 반응 집계: 기록(recordContentEvent)과 대시보드용 합계(getContentStats).
 * 임시 SQLite 파일에 마이그레이션을 적용해 실제 DB 동작으로 확인한다.
 */
describe("콘텐츠 반응 집계", () => {
  const dir = mkdtempSync(join(tmpdir(), "portfolio-events-"));
  const databaseUrl = `file:${join(dir, "test.db").replaceAll("\\", "/")}`;
  // 한국 시간 2026-11-17 12:00
  const now = new Date("2026-11-17T03:00:00.000Z");
  const DAY = 86_400_000;

  let db: typeof import("@/lib/db").db;
  let record: typeof import("@/lib/analytics/record");
  let stats: typeof import("@/lib/analytics/stats");
  let publishedId = 0;
  let hiddenId = 0;

  beforeAll(async () => {
    Object.assign(process.env, {
      DATABASE_URL: databaseUrl,
      UPLOAD_DIR: dir,
      SITE_URL: "http://localhost:3000",
      SESSION_SECRET: "unit-test-session-secret-0123456789abcdef",
      ANALYTICS_SECRET: "unit-test-analytics-secret-0123456789abcdef",
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
    record = await import("@/lib/analytics/record");
    stats = await import("@/lib/analytics/stats");

    const base = { summary: "요약", startDate: "2026-01", teamSize: 1 };
    publishedId = (await db.project.create({ data: { ...base, title: "공개", slug: "shown", isPublished: true } })).id;
    hiddenId = (await db.project.create({ data: { ...base, title: "비공개", slug: "hidden", isPublished: false } })).id;
  }, 60_000);

  afterAll(async () => {
    await db?.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  });

  it("같은 날 같은 항목은 한 행에 횟수로 쌓고, 비공개·없는 프로젝트는 기록하지 않는다", async () => {
    for (let i = 0; i < 3; i++) await record.recordContentEvent({ event: "home", target: "", now });
    expect(
      await record.recordContentEvent({ event: "card", target: String(publishedId), projectId: publishedId, now }),
    ).toBe("counted");
    expect(
      await record.recordContentEvent({ event: "card", target: String(hiddenId), projectId: hiddenId, now }),
    ).toBe("ignored");
    expect(await record.recordContentEvent({ event: "card", target: "99999", projectId: 99999, now })).toBe(
      "ignored",
    );

    const rows = await db.eventStat.findMany({ orderBy: { event: "asc" } });
    expect(rows).toMatchObject([
      { date: "2026-11-17", event: "card", target: String(publishedId), count: 1 },
      { date: "2026-11-17", event: "home", target: "", count: 3 },
    ]);
  });

  it("대시보드 합계는 기간 안의 값만 더하고, 공개 프로젝트별로 정리한다", async () => {
    const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY);
    await record.recordContentEvent({ event: "section", target: "projects", now });
    await record.recordContentEvent({ event: "section", target: "projects", now: at(29) });
    await record.recordContentEvent({ event: "section", target: "projects", now: at(30) }); // 30일 범위 밖
    await record.recordContentEvent({ event: "contact", target: "start", now });
    await record.recordContentEvent({ event: "contact", target: "sent", now });
    await record.recordContentEvent({ event: "pdf", target: "download", now });
    await record.recordContentEvent({ event: "link", target: "profile:blog", now });
    await record.recordContentEvent({
      event: "link",
      target: `project:${publishedId}:github`,
      projectId: publishedId,
      now,
    });
    await db.dailyStat.create({
      data: { date: "2026-11-16", path: "/projects/shown", projectId: publishedId, views: 4, visitors: 3 },
    });

    const result = await stats.getContentStats(30, now);
    expect(result.home).toBe(3);
    expect(result.sections).toEqual([
      { id: "projects", count: 2 },
      { id: "experience", count: 0 },
      { id: "skills", count: 0 },
      { id: "certificates", count: 0 },
      { id: "contact", count: 0 },
    ]);
    expect(result.contact).toEqual({ start: 1, sent: 1 });
    expect(result.pdf).toEqual({ view: 0, download: 1 });
    expect(result.profileLinks).toEqual([
      { key: "github", count: 0 },
      { key: "blog", count: 1 },
      { key: "velog", count: 0 },
      { key: "notion", count: 0 },
    ]);
    // 비공개 프로젝트는 목록에 나오지 않는다.
    expect(result.projects).toEqual([
      {
        id: publishedId,
        title: "공개",
        cardClicks: 1,
        detailViews: 4,
        links: { demo: 0, github: 1, docs: 0 },
      },
    ]);
  });
});
