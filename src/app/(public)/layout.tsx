import { Suspense } from "react";
import { Analytics } from "@/components/public/analytics";
import { getProfileLinks } from "@/components/public/home-sections";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader, type NavItem } from "@/components/public/site-header";
import {
  getCertificates,
  getProfile,
  getPublishedProjects,
  getSkillGroups,
} from "@/lib/data/public";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [profile, projects, skillGroups, certificates] = await Promise.all([
    getProfile(),
    getPublishedProjects(),
    getSkillGroups(),
    getCertificates(),
  ]);

  // 내용이 있는 섹션만 메뉴에 넣는다.
  const items: NavItem[] = [
    projects.length > 0 && { href: "/#projects", label: "프로젝트" },
    skillGroups.length > 0 && { href: "/#skills", label: "스킬" },
    certificates.length > 0 && { href: "/#certificates", label: "자격증" },
    getProfileLinks(profile).length > 0 && { href: "/#links", label: "링크" },
    { href: "/#contact", label: "문의" },
  ].filter((item): item is NavItem => Boolean(item));

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2.5 focus:font-semibold focus:text-white"
      >
        본문으로 건너뛰기
      </a>
      <SiteHeader name={profile.name} items={items} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter name={profile.name} showStatus={false} />
      {/* 방문 기록과 실시간 접속 신호. 현재 경로를 읽으므로 Suspense 로 감싼다. */}
      <Suspense fallback={null}>
        <Analytics />
      </Suspense>
    </>
  );
}
