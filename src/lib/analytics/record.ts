import "server-only";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { describeDevice, type ClientInfo } from "@/lib/device/describe";
import {
  cleanUtmSource,
  parseTrackedPath,
  referrerDomain,
  shouldCountView,
} from "./classify";
import { kstDate, kstDayStart, visitorHash } from "./visitor";

export type RecordResult = "counted" | "duplicate" | "ignored";

/**
 * 조회 1건을 기록한다.
 * - 집계 대상이 아닌 경로, 없는(또는 비공개) 프로젝트는 무시한다.
 * - 같은 방문자가 같은 페이지를 30분 안에 다시 보면 조회수를 올리지 않는다.
 * - 상세 로그(PageView)와 일별 집계(DailyStat)를 함께 갱신한다.
 */
export async function recordPageView(input: {
  path: unknown;
  referrer: unknown;
  utmSource: unknown;
  ip: string;
  userAgent: string;
  client?: ClientInfo;
  now?: Date;
}): Promise<RecordResult> {
  const page = parseTrackedPath(input.path);
  if (!page) return "ignored";

  const env = getEnv();
  const now = input.now ?? new Date();

  let projectId: number | null = null;
  if (page.kind === "project") {
    const project = await db.project.findFirst({
      where: { slug: page.slug, isPublished: true },
      select: { id: true },
    });
    if (!project) return "ignored";
    projectId = project.id;
  }

  const date = kstDate(now);
  const hash = visitorHash({
    ip: input.ip,
    userAgent: input.userAgent,
    secret: env.ANALYTICS_SECRET,
    date,
  });

  // 이 방문자가 오늘 이 페이지를 본 가장 최근 기록
  const last = await db.pageView.findFirst({
    where: { visitorHash: hash, path: page.path, createdAt: { gte: kstDayStart(date) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (last && !shouldCountView(last.createdAt, now)) return "duplicate";

  const siteHost = new URL(env.SITE_URL).hostname;
  const device = describeDevice(input.userAgent, input.client);
  // 오늘 처음 온 방문자일 때만 방문자 수를 올린다.
  const isNewVisitorToday = last === null;

  await db.$transaction([
    db.pageView.create({
      data: {
        path: page.path,
        projectId,
        visitorHash: hash,
        referrerDomain: referrerDomain(typeof input.referrer === "string" ? input.referrer : "", siteHost),
        utmSource: cleanUtmSource(typeof input.utmSource === "string" ? input.utmSource : ""),
        device: device.kind,
        browser: device.browser,
        os: device.os,
        model: device.model,
        createdAt: now,
      },
    }),
    db.dailyStat.upsert({
      where: { date_path: { date, path: page.path } },
      create: { date, path: page.path, projectId, views: 1, visitors: 1 },
      update: {
        views: { increment: 1 },
        visitors: { increment: isNewVisitorToday ? 1 : 0 },
        projectId,
      },
    }),
  ]);

  return "counted";
}

/**
 * 콘텐츠 반응 1건을 날짜·항목별 횟수에 더한다. 방문자 정보는 남기지 않는다.
 * 프로젝트에 딸린 이벤트는 공개 중인 프로젝트일 때만 기록한다(임의의 id 로 행이 쌓이는 것을 막는다).
 */
export async function recordContentEvent(input: {
  event: string;
  target: string;
  projectId?: number;
  now?: Date;
}): Promise<RecordResult> {
  if (input.projectId !== undefined) {
    const project = await db.project.findFirst({
      where: { id: input.projectId, isPublished: true },
      select: { id: true },
    });
    if (!project) return "ignored";
  }
  const date = kstDate(input.now ?? new Date());
  await db.eventStat.upsert({
    where: { date_event_target: { date, event: input.event, target: input.target } },
    create: { date, event: input.event, target: input.target, count: 1 },
    update: { count: { increment: 1 } },
  });
  return "counted";
}

/**
 * 보관 기간이 지난 상세 로그를 지운다. 일별 집계(DailyStat)는 그대로 둔다.
 * 지운 행 수를 돌려준다.
 */
export async function purgeOldPageViews(now = new Date()): Promise<number> {
  const days = getEnv().PAGEVIEW_RETENTION_DAYS;
  const cutoff = new Date(now.getTime() - days * 86_400_000);
  const result = await db.pageView.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return result.count;
}
