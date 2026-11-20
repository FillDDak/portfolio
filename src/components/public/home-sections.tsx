import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { TechLabel } from "@/components/tech-label";
import type {
  PublicCertificate,
  PublicExperienceGroup,
  PublicProjectCard,
  PublicSkillGroup,
} from "@/lib/data/public";
import { formatDate, formatMonth, formatPeriod } from "@/lib/format";
import { EXPERIENCE_KIND_LABEL } from "@/lib/validation/content";
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

type PublicExperience = PublicExperienceGroup["items"][number];

/** 수상은 받은 달, 같은 달에 시작하고 끝난 것은 그 달 하나, 나머지는 기간 */
function experiencePeriod(item: PublicExperience): string {
  if (item.kind === "AWARD" || item.endDate === item.startDate) return formatMonth(item.startDate);
  return formatPeriod(item.startDate, item.endDate || null);
}

export function ExperienceSection({ index, groups }: { index: number; groups: PublicExperienceGroup[] }) {
  return (
    <Section id="experience" index={index} title="경험">
      <dl className="divide-y divide-line border-y border-line">
        {groups.map((group) => (
          <div key={group.kind} className="grid gap-3 py-5 md:grid-cols-[11rem_1fr] md:gap-6 md:py-6">
            <dt className="font-semibold">{EXPERIENCE_KIND_LABEL[group.kind]}</dt>
            <dd>
              <ul className="space-y-5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                      <p>
                        <span className="font-semibold">{item.title}</span>
                        {item.subtitle ? <span className="text-muted"> · {item.subtitle}</span> : null}
                      </p>
                      <p className="shrink-0 text-[0.9375rem] text-muted tabular-nums">
                        <span className="sr-only">{item.kind === "AWARD" ? "수상 " : "기간 "}</span>
                        {experiencePeriod(item)}
                      </p>
                    </div>
                    {item.description ? (
                      <p className="mt-1.5 max-w-3xl text-[0.9375rem] whitespace-pre-line text-muted">
                        {item.description}
                      </p>
                    ) : null}
                    {item.project ? (
                      <Link
                        href={`/projects/${item.project.slug}`}
                        className="mt-1.5 inline-flex items-center gap-1 text-[0.9375rem] font-medium text-accent-ink underline-offset-4 hover:underline"
                      >
                        관련 프로젝트: {item.project.title}
                        <ArrowRightIcon className="size-3.5" />
                      </Link>
                    ) : null}
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
                        ? "inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 py-1 text-[0.9375rem] font-medium"
                        : "inline-flex items-center gap-1.5 rounded-md border border-dashed border-line-strong px-2.5 py-1 text-[0.9375rem] text-muted"
                    }
                  >
                    <TechLabel name={skill.name} />
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
