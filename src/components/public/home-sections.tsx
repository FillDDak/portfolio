import { ArrowUpRightIcon, GitHubIcon, NoteIcon, PenIcon } from "@/components/icons";
import type {
  PublicCertificate,
  PublicProfile,
  PublicProjectCard,
  PublicSkillGroup,
} from "@/lib/data/public";
import { displayUrl, formatDate } from "@/lib/format";
import { ProjectCard } from "./project-card";
import { Section } from "./section";

export function ProjectsSection({ index, projects }: { index: number; projects: PublicProjectCard[] }) {
  return (
    <Section id="projects" index={index} title="프로젝트">
      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </Section>
  );
}

export function SkillsSection({ index, groups }: { index: number; groups: PublicSkillGroup[] }) {
  const hasLearned = groups.some((group) => group.skills.some((skill) => skill.level === "LEARNED"));
  return (
    <Section
      id="skills"
      index={index}
      title="보유 스킬"
      aside={
        hasLearned ? (
          <ul aria-label="표시 기준" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3 rounded-sm border border-line-strong bg-surface" />
              실무·프로젝트 사용
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3 rounded-sm border border-dashed border-line-strong" />
              학습 경험
            </li>
          </ul>
        ) : null
      }
    >
      <dl className="divide-y divide-line border-y border-line">
        {groups.map((group) => (
          <div key={group.id} className="grid gap-2.5 py-4 md:grid-cols-[11rem_1fr] md:gap-6 md:py-5">
            <dt className="font-semibold md:pt-1">{group.name}</dt>
            <dd>
              <ul className="flex flex-wrap gap-2">
                {group.skills.map((skill) => (
                  <li
                    key={skill.id}
                    className={
                      skill.level === "USED"
                        ? "rounded-md border border-line-strong bg-surface px-2.5 py-1 text-[0.9375rem] font-medium"
                        : "rounded-md border border-dashed border-line-strong px-2.5 py-1 text-[0.9375rem] text-muted"
                    }
                  >
                    {skill.name}
                    <span className="sr-only">
                      {skill.level === "USED" ? " (실무·프로젝트 사용)" : " (학습 경험)"}
                    </span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

export function CertificatesSection({
  index,
  certificates,
}: {
  index: number;
  certificates: PublicCertificate[];
}) {
  return (
    <Section id="certificates" index={index} title="자격증">
      <ul className="divide-y divide-line border-y border-line">
        {certificates.map((certificate) => (
          <li
            key={certificate.id}
            className="flex flex-col gap-0.5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
          >
            <p>
              <span className="font-semibold">{certificate.name}</span>
              <span className="text-muted">
                {" · "}
                {certificate.issuer}
              </span>
            </p>
            <p className="shrink-0 text-[0.9375rem] text-muted tabular-nums">
              <span className="sr-only">취득일 </span>
              <time dateTime={certificate.acquiredAt}>{formatDate(certificate.acquiredAt)}</time>
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export type ProfileLink = { key: string; label: string; url: string };

/** 값이 있는 링크만 골라낸다. */
export function getProfileLinks(profile: PublicProfile): ProfileLink[] {
  return [
    { key: "github", label: "GitHub", url: profile.githubUrl },
    { key: "velog", label: "Velog", url: profile.velogUrl },
    { key: "notion", label: "Notion", url: profile.notionUrl },
  ].filter((link) => link.url);
}

const linkIcons: Record<string, typeof GitHubIcon> = {
  github: GitHubIcon,
  velog: PenIcon,
  notion: NoteIcon,
};

export function LinksSection({ index, links }: { index: number; links: ProfileLink[] }) {
  return (
    <Section id="links" index={index} title="링크">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => {
          const Icon = linkIcons[link.key] ?? NoteIcon;
          return (
            <li key={link.key}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-16 items-center gap-3.5 rounded-xl border border-line bg-surface px-4 py-3 transition-colors duration-150 hover:border-line-strong"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                  <Icon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{link.label}</span>
                  <span className="block truncate text-sm text-muted">{displayUrl(link.url)}</span>
                </span>
                <ArrowUpRightIcon
                  width={18}
                  height={18}
                  className="shrink-0 text-muted transition-colors group-hover:text-accent-ink"
                />
                <span className="sr-only">(새 탭에서 열림)</span>
              </a>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
