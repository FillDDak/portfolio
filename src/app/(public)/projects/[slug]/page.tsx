import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowUpRightIcon, GitHubIcon, MailIcon, NoteIcon } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { buttonClass } from "@/components/ui/button";
import { getPublishedProject } from "@/lib/data/public";
import { formatPeriod } from "@/lib/format";

type Props = PageProps<"/projects/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) return { title: "프로젝트를 찾을 수 없습니다" };
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.summary,
      url: `/projects/${project.slug}`,
      ...(project.coverImage ? { images: [`/uploads/${project.coverImage}`] } : {}),
    },
  };
}

export default function ProjectPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-6 pb-16 md:px-8 md:pt-10 md:pb-24">
      <Link
        href="/#projects"
        className="-ml-1 inline-flex min-h-11 items-center px-1 text-[0.9375rem] font-medium text-muted hover:text-foreground"
      >
        ← 프로젝트 목록
      </Link>
      {/* 주소의 slug 는 요청 시점에 정해지므로 Suspense 안에서 읽는다. */}
      <Suspense fallback={<ProjectSkeleton />}>
        <ProjectContent params={params} />
      </Suspense>
    </div>
  );
}

async function ProjectContent({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) notFound();

  const links = [
    { label: "데모", url: project.demoUrl, Icon: ArrowUpRightIcon },
    { label: "GitHub", url: project.githubUrl, Icon: GitHubIcon },
    { label: "API 문서", url: project.docsUrl, Icon: NoteIcon },
  ].filter((link) => link.url);

  return (
    <article className="fade-in mt-3">
      <header>
        {project.isFeatured ? (
          <p className="mb-2 inline-flex items-center rounded-md bg-accent-soft px-2 py-0.5 text-[0.8125rem] font-semibold text-accent-ink">
            대표 프로젝트
          </p>
        ) : null}
        <h1 className="text-[1.875rem] leading-tight font-bold tracking-tight md:text-[2.5rem]">
          {project.title}
        </h1>
        <p className="mt-3 text-lg text-muted md:text-xl">{project.summary}</p>

        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 border-y border-line py-4">
          <dt className="text-muted">기간</dt>
          <dd className="font-medium tabular-nums">{formatPeriod(project.startDate, project.endDate)}</dd>
          <dt className="text-muted">인원</dt>
          <dd className="font-medium">{project.teamSize > 1 ? `${project.teamSize}명` : "개인 프로젝트"}</dd>
          {project.role ? (
            <>
              <dt className="text-muted">내 역할</dt>
              <dd className="font-medium">{project.role}</dd>
            </>
          ) : null}
          {project.tags.length > 0 ? (
            <>
              <dt className="text-muted">스택</dt>
              <dd>
                <ul className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[0.8125rem] text-muted"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          ) : null}
        </dl>

        {links.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            {links.map(({ label, url, Icon }, index) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass(
                  index === 0 ? "primary" : "secondary",
                  `sm:min-w-32 ${links.length % 2 === 1 && index === 0 ? "col-span-2" : ""}`,
                )}
              >
                <Icon width={18} height={18} />
                {label}
                <span className="sr-only">(새 탭에서 열림)</span>
              </a>
            ))}
          </div>
        ) : null}
      </header>

      {project.highlights.length > 0 ? (
        <section aria-labelledby="highlights-heading" className="mt-8 rounded-xl bg-surface-2 p-5 md:p-6">
          <h2 id="highlights-heading" className="text-sm font-semibold text-muted">
            핵심 성과
          </h2>
          <ul className="mt-2.5 space-y-2">
            {project.highlights.map((item) => (
              <li key={item} className="flex gap-2.5 text-[1.0625rem] font-semibold tabular-nums">
                <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-ink" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {project.coverImage ? (
        <figure className="mt-8">
          <a href={`/uploads/${project.coverImage}`} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 시 이미 webp 로 변환·리사이즈했다 */}
            <img
              src={`/uploads/${project.coverImage}`}
              alt={`${project.title} 대표 이미지`}
              className="w-full rounded-xl border border-line"
            />
            <span className="sr-only">(원본 크기로 새 탭에서 열림)</span>
          </a>
        </figure>
      ) : null}

      {project.body.trim() ? (
        <div className="mt-10">
          <Markdown>{project.body}</Markdown>
        </div>
      ) : null}

      {project.images.length > 0 ? (
        <section aria-labelledby="gallery-heading" className="mt-12 border-t border-line pt-8">
          <h2 id="gallery-heading" className="text-2xl font-bold tracking-tight">
            이미지
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {project.images.map((image, index) => (
              <li key={image.file}>
                <figure>
                  <a href={`/uploads/${image.file}`} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 시 이미 webp 로 변환·리사이즈했다 */}
                    <img
                      src={`/uploads/${image.file}`}
                      alt={image.alt || `${project.title} 이미지 ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] w-full rounded-xl border border-line bg-surface-2 object-cover"
                    />
                    <span className="sr-only">(원본 크기로 새 탭에서 열림)</span>
                  </a>
                  {image.alt ? (
                    <figcaption className="mt-2 text-sm text-muted">{image.alt}</figcaption>
                  ) : null}
                </figure>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-12 flex flex-col gap-3 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">이 프로젝트에 대해 더 궁금한 점이 있다면 편하게 문의해 주세요.</p>
        <Link href="/#contact" className={buttonClass("primary", "shrink-0")}>
          <MailIcon />
          문의하기
        </Link>
      </footer>
    </article>
  );
}

function ProjectSkeleton() {
  return (
    <div className="mt-3" aria-busy="true" aria-label="프로젝트를 불러오는 중">
      <div className="h-10 w-3/4 rounded-lg bg-surface-2" />
      <div className="mt-4 h-6 w-full rounded-lg bg-surface-2" />
      <div className="mt-6 h-32 w-full rounded-lg bg-surface-2" />
      <div className="mt-8 h-64 w-full rounded-lg bg-surface-2" />
    </div>
  );
}
