import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSiteUrl } from "@/lib/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // 빌드할 때가 아니라 실행 중인 서버의 SITE_URL 을 쓰도록 요청 시점에 만든다.
  await connection();
  const siteUrl = getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
