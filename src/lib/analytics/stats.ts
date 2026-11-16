import "server-only";
import { db } from "@/lib/db";
import { addDays, kstDate, kstDayStart } from "./visitor";

/** 관리자 대시보드용 조회 함수. 캐시하지 않고 항상 최신 값을 읽는다. */

export type ProjectViews = {
  id: number;
  title: string;
  slug: string;
  isPublished: boolean;
  total: number;
  last7: number;
  last30: number;
};

/** 프로젝트별 조회수: 전체, 최근 7일, 최근 30일 (오늘 포함) */
export async function getProjectViews(now = new Date()): Promise<ProjectViews[]> {
  const today = kstDate(now);
  const from7 = addDays(today, -6);
  const from30 = addDays(today, -29);

  const [projects, total, last30, last7] = await Promise.all([
    db.project.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, title: true, slug: true, isPublished: true },
    }),
    db.dailyStat.groupBy({ by: ["projectId"], where: { projectId: { not: null } }, _sum: { views: true } }),
    db.dailyStat.groupBy({
      by: ["projectId"],
      where: { projectId: { not: null }, date: { gte: from30 } },
      _sum: { views: true },
    }),
    db.dailyStat.groupBy({
      by: ["projectId"],
      where: { projectId: { not: null }, date: { gte: from7 } },
      _sum: { views: true },
    }),
  ]);

  const toMap = (rows: { projectId: number | null; _sum: { views: number | null } }[]) =>
    new Map(rows.map((row) => [row.projectId, row._sum.views ?? 0]));
  const totalMap = toMap(total);
  const map30 = toMap(last30);
  const map7 = toMap(last7);

  return projects.map((project) => ({
    ...project,
    total: totalMap.get(project.id) ?? 0,
    last7: map7.get(project.id) ?? 0,
    last30: map30.get(project.id) ?? 0,
  }));
}

export type DailyPoint = { date: string; views: number; visitors: number };

/**
 * 최근 days 일의 일별 조회수. 기록이 없는 날도 0 으로 채워서 돌려준다.
 * projectId 를 주면 그 프로젝트 상세 페이지만, 없으면 사이트 전체.
 */
export async function getDailyTrend(options: {
  days: number;
  projectId?: number | null;
  now?: Date;
}): Promise<DailyPoint[]> {
  const today = kstDate(options.now ?? new Date());
  const from = addDays(today, -(options.days - 1));
  const rows = await db.dailyStat.groupBy({
    by: ["date"],
    where: { date: { gte: from, lte: today }, ...(options.projectId ? { projectId: options.projectId } : {}) },
    _sum: { views: true, visitors: true },
  });
  const byDate = new Map(rows.map((row) => [row.date, row._sum]));
  return Array.from({ length: options.days }, (_, index) => {
    const date = addDays(from, index);
    const sum = byDate.get(date);
    return { date, views: sum?.views ?? 0, visitors: sum?.visitors ?? 0 };
  });
}

/** 사이트 전체 조회수 요약 */
export async function getSiteTotals(now = new Date()) {
  const today = kstDate(now);
  const sum = async (from?: string) =>
    (
      await db.dailyStat.aggregate({
        where: from ? { date: { gte: from } } : {},
        _sum: { views: true },
      })
    )._sum.views ?? 0;
  const [todayViews, last7, last30, total] = await Promise.all([
    sum(today),
    sum(addDays(today, -6)),
    sum(addDays(today, -29)),
    sum(),
  ]);
  return { today: todayViews, last7, last30, total };
}

export const VIEW_LOG_PAGE_SIZE = 30;

export type ViewLogFilter = {
  /** YYYY-MM-DD (한국 시간) */
  from?: string;
  to?: string;
  projectId?: number;
  page: number;
};

/** 조회 기록 목록 (최신순, 페이지네이션) */
export async function getViewLog(filter: ViewLogFilter) {
  const createdAt: { gte?: Date; lt?: Date } = {};
  if (filter.from) createdAt.gte = kstDayStart(filter.from);
  if (filter.to) createdAt.lt = kstDayStart(addDays(filter.to, 1));
  const where = {
    ...(filter.from || filter.to ? { createdAt } : {}),
    ...(filter.projectId ? { projectId: filter.projectId } : {}),
  };

  const [count, rows] = await Promise.all([
    db.pageView.count({ where }),
    db.pageView.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * VIEW_LOG_PAGE_SIZE,
      take: VIEW_LOG_PAGE_SIZE,
      select: {
        id: true,
        path: true,
        referrerDomain: true,
        utmSource: true,
        device: true,
        createdAt: true,
      },
    }),
  ]);

  return { count, rows, pageCount: Math.max(1, Math.ceil(count / VIEW_LOG_PAGE_SIZE)) };
}
