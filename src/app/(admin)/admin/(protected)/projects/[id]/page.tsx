import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, PageHeader, Panel } from "@/components/admin/page-header";
import { ProjectForm, type ProjectFormValues } from "@/components/admin/project-form";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { postCategoryLabel } from "@/lib/post-category";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다(아래 layout.tsx 설명 참고).
export const instant = false;

export const metadata: Metadata = { title: "프로젝트 수정" };

export default async function EditProjectPage({ params }: PageProps<"/admin/projects/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId)) notFound();

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tags: { orderBy: { sortOrder: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
      posts: {
        orderBy: [{ date: "asc" }, { id: "asc" }],
        select: { id: true, title: true, category: true, date: true, isPublished: true },
      },
    },
  });
  if (!project) notFound();

  const values: ProjectFormValues = {
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    role: project.role,
    teamSize: String(project.teamSize),
    startDate: project.startDate,
    endDate: project.endDate ?? "",
    highlights: project.highlights,
    body: project.body,
    coverImage: project.coverImage ?? "",
    demoUrl: project.demoUrl,
    githubUrl: project.githubUrl,
    docsUrl: project.docsUrl,
    isPublished: project.isPublished,
    isFeatured: project.isFeatured,
    tags: project.tags.map((tag) => tag.name).join(", "),
    images: project.images.map((image) => ({ file: image.file, alt: image.alt })),
  };

  return (
    <div className="max-w-3xl">
      <Link href="/admin/projects" className="mb-3 inline-flex min-h-11 items-center text-muted hover:text-foreground">
        ← 프로젝트 목록
      </Link>
      <PageHeader
        title="프로젝트 수정"
        description="미리보기는 공개 페이지와 같은 화면을 비공개 상태에서도 보여 줍니다. 저장한 내용 기준이라, 고친 뒤에는 먼저 저장하세요."
        action={
          <a
            href={`/admin/preview/projects/${project.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("secondary")}
          >
            미리보기<span className="sr-only"> (새 탭에서 열림)</span>
          </a>
        }
      />
      {/* 다른 프로젝트로 이동하면 폼 상태를 새로 만든다. */}
      <ProjectForm key={project.id} projectId={project.id} initialValues={values} />

      {/* 트러블슈팅처럼 이 프로젝트에 연결한 글. 글은 '블로그' 메뉴에서 따로 저장한다. */}
      <Panel title="트러블슈팅 · 관련 글" className="mt-8">
        <p className="-mt-2 mb-4 text-[0.9375rem] text-muted">
          공개한 글은 이 프로젝트 상세 페이지 아래에 날짜 순서로 보입니다.
        </p>
        {project.posts.length === 0 ? (
          <EmptyState>연결한 글이 없습니다.</EmptyState>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {project.posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/admin/blog/${post.id}`}
                  className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 hover:bg-surface-2"
                >
                  <span className="text-sm text-muted tabular-nums">{formatDate(post.date)}</span>
                  <span className="text-sm font-semibold text-accent-ink">{postCategoryLabel(post.category)}</span>
                  <span className="min-w-0 flex-1 font-medium">{post.title}</span>
                  {post.isPublished ? null : <span className="text-sm text-muted">비공개</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/admin/blog/new?project=${project.id}`} className={buttonClass("secondary", "mt-4")}>
          이 프로젝트의 글 쓰기
        </Link>
      </Panel>
    </div>
  );
}
