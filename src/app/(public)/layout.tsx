import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_MARK } from "@/lib/site";
import { Analytics } from "@/components/public/analytics";
import { getProfileLinks } from "@/components/public/profile-links";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader, type NavItem } from "@/components/public/site-header";
import {
  getActiveMonitors,
  getCertificates,
  getExperiences,
  getProfile,
  getPublishedPosts,
  getPublishedProjects,
  getSkillGroups,
} from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const title = `${profile.name} | ${profile.jobTitle}`;
  const description = profile.tagline || `${profile.jobTitle} ${profile.name}의 포트폴리오`;
  return {
    title: { default: title, template: `%s | ${profile.name}` },
    description,
    authors: [{ name: profile.name }],
    openGraph: {
      type: "website",
      siteName: SITE_MARK,
      locale: "ko_KR",
      title,
      description,
      url: "/",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [profile, projects, posts, experiences, skillGroups, certificates, monitors] = await Promise.all([
    getProfile(),
    getPublishedProjects(),
    getPublishedPosts(),
    getExperiences(),
    getSkillGroups(),
    getCertificates(),
    getActiveMonitors(),
  ]);

  // 메뉴는 홈의 섹션 목록이다. 내용이 있는 섹션만 넣는다.
  const items: NavItem[] = [
    { href: "/#about", label: "소개" },
    projects.length > 0 && { href: "/#projects", label: "프로젝트" },
    experiences.length > 0 && { href: "/#experience", label: "경험" },
    skillGroups.length > 0 && { href: "/#skills", label: "스킬" },
    certificates.length > 0 && { href: "/#certificates", label: "자격증" },
    // 문의 섹션은 헤더의 '문의하기' 버튼이 맡으므로 메뉴에 따로 넣지 않는다.
    // 블로그는 홈 섹션이 아니라서 메뉴 대신 GitHub·Notion 과 같은 줄(첫 화면, 모바일 메뉴, 푸터)에 둔다.
  ].filter((item): item is NavItem => Boolean(item));
  const links = getProfileLinks(profile, posts.length > 0);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2.5 focus:font-semibold focus:text-white"
      >
        본문으로 건너뛰기
      </a>
      <SiteHeader items={items} links={links} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter name={profile.name} links={links} showStatus={monitors.length > 0} />
      {/* 방문 기록과 실시간 접속 신호. 현재 경로를 읽으므로 Suspense 로 감싼다. */}
      <Suspense fallback={null}>
        <Analytics />
      </Suspense>
    </>
  );
}
