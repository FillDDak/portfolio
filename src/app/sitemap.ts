import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getActiveMonitors, getPublishedProjectDates } from "@/lib/data/public";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 빌드할 때가 아니라 실행 중인 서버의 SITE_URL 과 현재 내용을 쓰도록 요청 시점에 만든다.
  await connection();
  const siteUrl = getSiteUrl();
  const [projects, monitors] = await Promise.all([getPublishedProjectDates(), getActiveMonitors()]);

  return [
    { url: `${siteUrl}/`, priority: 1 },
    ...projects.map((project) => ({
      url: `${siteUrl}/projects/${project.slug}`,
      lastModified: project.updatedAt,
      priority: 0.8,
    })),
    // 표시할 주소가 없으면 상태 페이지는 404 이므로 넣지 않는다.
    ...(monitors.length > 0 ? [{ url: `${siteUrl}/status`, priority: 0.2 }] : []),
  ];
}
