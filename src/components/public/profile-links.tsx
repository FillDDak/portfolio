import { GitHubIcon, NotionIcon, VelogIcon } from "@/components/icons";
import type { PublicProfile } from "@/lib/data/public";

export type ProfileLink = { key: "github" | "velog" | "notion"; label: string; url: string };

/** 프로필의 외부 링크 중 값이 있는 것만 골라낸다. 첫 화면과 헤더가 같은 목록을 쓴다. */
export function getProfileLinks(profile: Pick<PublicProfile, "githubUrl" | "velogUrl" | "notionUrl">): ProfileLink[] {
  const links: ProfileLink[] = [
    { key: "github", label: "GitHub", url: profile.githubUrl },
    { key: "velog", label: "Velog", url: profile.velogUrl },
    { key: "notion", label: "Notion", url: profile.notionUrl },
  ];
  return links.filter((link) => link.url);
}

export const profileLinkIcons: Record<ProfileLink["key"], typeof GitHubIcon> = {
  github: GitHubIcon,
  velog: VelogIcon,
  notion: NotionIcon,
};
