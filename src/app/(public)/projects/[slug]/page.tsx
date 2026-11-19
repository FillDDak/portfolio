import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectArticle } from "@/components/public/project-article";
import { getPublishedProject } from "@/lib/data/public";
import { SITE_MARK } from "@/lib/site";

type Props = PageProps<"/projects/[slug]">;

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) return { title: "프로젝트를 찾을 수 없습니다" };
  // 대표 이미지가 없으면 사이트 공통 미리보기 이미지를 그대로 쓴다.
  const images = project.coverImage
    ? [`/uploads/${project.coverImage}`]
    : ((await parent).openGraph?.images ?? []);
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: "article",
      siteName: SITE_MARK,
      locale: "ko_KR",
      title: project.title,
      description: project.summary,
      url: `/projects/${project.slug}`,
      images,
    },
    ...(project.coverImage ? { twitter: { card: "summary_large_image", images } } : {}),
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
  return <ProjectArticle project={project} />;
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
