import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { ProjectForm, type ProjectFormValues } from "@/components/admin/project-form";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";

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
      <PageHeader title="프로젝트 수정" />
      {/* 다른 프로젝트로 이동하면 폼 상태를 새로 만든다. */}
      <ProjectForm key={project.id} projectId={project.id} initialValues={values} />
    </div>
  );
}
