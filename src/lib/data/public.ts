import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";

/**
 * 공개 페이지에서 쓰는 조회 함수.
 * 결과는 태그와 함께 캐시되고, 관리자 화면에서 저장할 때 해당 태그를 갱신한다.
 */
export const CACHE_TAGS = {
  profile: "profile",
  projects: "projects",
  skills: "skills",
  certificates: "certificates",
  monitors: "monitors",
} as const;

export const ALL_CACHE_TAGS = Object.values(CACHE_TAGS);

export async function getProfile() {
  "use cache";
  cacheLife("max");
  cacheTag(CACHE_TAGS.profile);
  const profile = await db.profile.findUnique({ where: { id: 1 } });
  if (!profile) throw new Error("프로필 데이터가 없습니다. 마이그레이션을 먼저 실행하세요.");
  return {
    name: profile.name,
    jobTitle: profile.jobTitle,
    tagline: profile.tagline,
    bio: profile.bio,
    coreStack: splitList(profile.coreStack),
    githubUrl: profile.githubUrl,
    velogUrl: profile.velogUrl,
    notionUrl: profile.notionUrl,
    contactEmail: profile.contactEmail,
    hasResume: Boolean(profile.resumeFile),
    resumeUpdatedAt: profile.resumeUpdatedAt?.toISOString() ?? null,
    photoUrl: profile.photoFile ? `/uploads/${profile.photoFile}` : null,
  };
}

export type PublicProfile = Awaited<ReturnType<typeof getProfile>>;

export async function getPublishedProjects() {
  "use cache";
  cacheLife("max");
  cacheTag(CACHE_TAGS.projects);
  const projects = await db.project.findMany({
    where: { isPublished: true },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
    include: { tags: { orderBy: { sortOrder: "asc" } } },
  });
  return projects.map((project) => ({
    id: project.id,
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    role: project.role,
    teamSize: project.teamSize,
    startDate: project.startDate,
    endDate: project.endDate,
    highlights: splitLines(project.highlights),
    coverImage: project.coverImage,
    isFeatured: project.isFeatured,
    tags: project.tags.map((tag) => tag.name),
  }));
}

export type PublicProjectCard = Awaited<ReturnType<typeof getPublishedProjects>>[number];

export async function getSkillGroups() {
  "use cache";
  cacheLife("max");
  cacheTag(CACHE_TAGS.skills);
  const categories = await db.skillCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { skills: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
  });
  // 스킬이 하나도 없는 분류는 공개 페이지에 보여주지 않는다.
  return categories
    .filter((category) => category.skills.length > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      skills: category.skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        level: skill.level === "LEARNED" ? ("LEARNED" as const) : ("USED" as const),
      })),
    }));
}

export type PublicSkillGroup = Awaited<ReturnType<typeof getSkillGroups>>[number];

export async function getCertificates() {
  "use cache";
  cacheLife("max");
  cacheTag(CACHE_TAGS.certificates);
  const certificates = await db.certificate.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return certificates.map(({ id, name, issuer, acquiredAt }) => ({ id, name, issuer, acquiredAt }));
}

export type PublicCertificate = Awaited<ReturnType<typeof getCertificates>>[number];

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** 공개된 프로젝트 한 건의 상세 정보. 없거나 비공개면 null. */
export async function getPublishedProject(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(CACHE_TAGS.projects);
  const project = await db.project.findFirst({
    where: { slug, isPublished: true },
    include: PROJECT_DETAIL_INCLUDE,
  });
  return project ? toProjectDetail(project) : null;
}

/** 프로젝트 상세 화면에 필요한 태그·이미지(정렬 순서대로) */
export const PROJECT_DETAIL_INCLUDE = {
  tags: { orderBy: { sortOrder: "asc" } },
  images: { orderBy: { sortOrder: "asc" } },
} as const;

type ProjectWithDetail = NonNullable<
  Awaited<ReturnType<typeof db.project.findFirst<{ include: typeof PROJECT_DETAIL_INCLUDE }>>>
>;

/** DB 의 프로젝트를 상세 화면에서 쓰는 형태로 바꾼다. 공개 페이지와 관리자 미리보기가 함께 쓴다. */
export function toProjectDetail(project: ProjectWithDetail) {
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    role: project.role,
    teamSize: project.teamSize,
    startDate: project.startDate,
    endDate: project.endDate,
    highlights: splitLines(project.highlights),
    body: project.body,
    coverImage: project.coverImage,
    demoUrl: project.demoUrl,
    githubUrl: project.githubUrl,
    docsUrl: project.docsUrl,
    isFeatured: project.isFeatured,
    tags: project.tags.map((tag) => tag.name),
    images: project.images.map((image) => ({ file: image.file, alt: image.alt })),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export type PublicProject = NonNullable<Awaited<ReturnType<typeof getPublishedProject>>>;

/** sitemap 용: 공개된 프로젝트의 주소와 마지막 수정 시각 */
export async function getPublishedProjectDates() {
  "use cache";
  cacheLife("max");
  cacheTag(CACHE_TAGS.projects);
  const projects = await db.project.findMany({
    where: { isPublished: true },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
    select: { slug: true, updatedAt: true },
  });
  return projects.map(({ slug, updatedAt }) => ({ slug, updatedAt: updatedAt.toISOString() }));
}

/** 상태 페이지에 표시할 감시 대상 */
export async function getActiveMonitors() {
  "use cache";
  cacheLife("max");
  cacheTag(CACHE_TAGS.monitors);
  const monitors = await db.monitor.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  // 상태 페이지에서 url 은 글자로 보여 주지 않고 '방문' 버튼의 링크로만 쓴다.
  return monitors.map(({ id, name, description, url }) => ({ id, name, description, url }));
}
