import { BlogIcon, GitHubIcon, NotionIcon, VelogIcon } from "@/components/icons";
import type { PublicProfile } from "@/lib/data/public";

/** external: 새 탭에서 여는 다른 사이트. 블로그는 이 사이트 안의 페이지라 같은 탭에서 연다. */
export type ProfileLink = { key: "github" | "blog" | "velog" | "notion"; label: string; url: string; external: boolean };

/**
 * 첫 화면, 모바일 메뉴, 푸터에 함께 보이는 프로필 링크. 값이 있는 것만 골라낸다.
 * 블로그는 공개한 글이 있을 때만, 외부 링크는 관리자에서 주소를 넣었을 때만 보인다.
 */
export function getProfileLinks(
  profile: Pick<PublicProfile, "githubUrl" | "velogUrl" | "notionUrl">,
  hasBlog: boolean,
): ProfileLink[] {
  const links: ProfileLink[] = [
    { key: "github", label: "GitHub", url: profile.githubUrl, external: true },
    { key: "blog", label: "Blog", url: hasBlog ? "/blog" : "", external: false },
    { key: "velog", label: "Velog", url: profile.velogUrl, external: true },
    { key: "notion", label: "Notion", url: profile.notionUrl, external: true },
  ];
  return links.filter((link) => link.url);
}

/** 다른 사이트 링크는 새 탭에서 연다. */
export const linkTargetProps = (link: ProfileLink) =>
  link.external ? { target: "_blank", rel: "noopener noreferrer" } : {};

export const profileLinkIcons: Record<ProfileLink["key"], typeof GitHubIcon> = {
  github: GitHubIcon,
  blog: BlogIcon,
  velog: VelogIcon,
  notion: NotionIcon,
};
