import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { toPostCategory } from "@/lib/post-category";
import { EXPERIENCE_KINDS, type ExperienceKind } from "@/lib/validation/content";

/**
 * 공개 페이지에서 쓰는 조회 함수.
 * 결과는 태그와 함께 캐시되고, 관리자 화면에서 저장할 때 해당 태그를 갱신한다.
 */
export const CACHE_TAGS = {
  profile: "profile",
  projects: "projects",
  skills: "skills",
  certificates: "certificates",
  experiences: "experiences",
  posts: "posts",
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

/**
 * 경험을 종류별로 묶는다. 묶음은 학력 → 교육 → 활동 → 수상 순서이고,
 * 각 묶음 안에서는 진행 중인 것, 최근에 끝난 것, 최근에 시작한 것 순서다.
 * 연결한 프로젝트는 공개 중일 때만 링크로 쓴다.
 */
export async function getExperienceGroups() {
  "use cache";
  cacheLife("max");
  cacheTag(CACHE_TAGS.experiences, CACHE_TAGS.projects);
  const rows = await db.experience.findMany({
    include: { project: { select: { slug: true, title: true, isPublished: true } } },
  });
  const latest = (row: { startDate: string; endDate: string }) => row.endDate || "9999-99";
  rows.sort(
    (a, b) =>
      latest(b).localeCompare(latest(a)) || b.startDate.localeCompare(a.startDate) || a.id - b.id,
  );
  return EXPERIENCE_KINDS.map((kind) => ({
    kind,
    items: rows
      .filter((row) => row.kind === kind)
      .map((row) => ({
        id: row.id,
        kind: row.kind as ExperienceKind,
        title: row.title,
        subtitle: row.subtitle,
        startDate: row.startDate,
        endDate: row.endDate,
        description: row.description,
        project: row.project?.isPublished ? { slug: row.project.slug, title: row.project.title } : null,
      })),
  })).filter((group) => group.items.length > 0);
}

export type PublicExperienceGroup = Awaited<ReturnType<typeof getExperienceGroups>>[number];

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

/* ── 글 ─────────────────────────────────────────────────── */

const POST_ORDER = [{ date: "desc" }, { id: "desc" }] as const;

const POST_CARD_SELECT = {
  id: true,
  category: true,
  title: true,
  slug: true,
  summary: true,
  tags: true,
  date: true,
  project: { select: { slug: true, title: true, isPublished: true } },
} as const;

type PostCardRow = NonNullable<
  Awaited<ReturnType<typeof db.post.findFirst<{ select: typeof POST_CARD_SELECT }>>>
>;

/** 연결한 프로젝트는 공개 중일 때만 링크로 쓴다. */
function toPostCard(row: PostCardRow) {
  return {
    id: row.id,
    category: toPostCategory(row.category),
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    tags: splitList(row.tags),
    date: row.date,
    project: row.project?.isPublished ? { slug: row.project.slug, title: row.project.title } : null,
  };
}

export type PublicPostCard = ReturnType<typeof toPostCard>;

/** 공개된 글 목록(최신순) */
export async function getPublishedPosts() {
  "use cache";
  cacheLife("max");
  cacheTag(CACHE_TAGS.posts, CACHE_TAGS.projects);
  const rows = await db.post.findMany({
    where: { isPublished: true },
    orderBy: [...POST_ORDER],
    select: POST_CARD_SELECT,
  });
  return rows.map(toPostCard);
}

/** 프로젝트에 연결된 공개 글. 프로젝트 상세 페이지 아래에 보여 준다(오래된 것부터, 겪은 순서대로). */
export async function getProjectPosts(projectId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(CACHE_TAGS.posts, CACHE_TAGS.projects);
  const rows = await db.post.findMany({
    where: { isPublished: true, projectId },
    orderBy: [{ date: "asc" }, { id: "asc" }],
    select: POST_CARD_SELECT,
  });
  return rows.map(toPostCard);
}

/** 공개된 글 한 건. 없거나 비공개면 null. */
export async function getPublishedPost(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(CACHE_TAGS.posts, CACHE_TAGS.projects);
  const post = await db.post.findFirst({
    where: { slug, isPublished: true },
    select: POST_DETAIL_SELECT,
  });
  return post ? toPostDetail(post) : null;
}

export const POST_DETAIL_SELECT = { ...POST_CARD_SELECT, body: true, updatedAt: true } as const;

type PostDetailRow = NonNullable<
  Awaited<ReturnType<typeof db.post.findFirst<{ select: typeof POST_DETAIL_SELECT }>>>
>;

/** DB 의 글을 상세 화면에서 쓰는 형태로 바꾼다. 공개 페이지와 관리자 미리보기가 함께 쓴다. */
export function toPostDetail(post: PostDetailRow) {
  return { ...toPostCard(post), body: post.body, updatedAt: post.updatedAt.toISOString() };
}

export type PublicPost = ReturnType<typeof toPostDetail>;

/** sitemap 용: 공개된 글의 주소와 마지막 수정 시각 */
export async function getPublishedPostDates() {
  "use cache";
  cacheLife("max");
  cacheTag(CACHE_TAGS.posts);
  const posts = await db.post.findMany({
    where: { isPublished: true },
    orderBy: [...POST_ORDER],
    select: { slug: true, updatedAt: true },
  });
  return posts.map(({ slug, updatedAt }) => ({ slug, updatedAt: updatedAt.toISOString() }));
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
