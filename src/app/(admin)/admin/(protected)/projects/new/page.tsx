import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { emptyProjectValues, ProjectForm } from "@/components/admin/project-form";
import { requireAdmin } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "새 프로젝트" };

export default async function NewProjectPage() {
  await requireAdmin();
  return (
    <div className="max-w-3xl">
      <Link href="/admin/projects" className="mb-3 inline-flex min-h-11 items-center text-muted hover:text-foreground">
        ← 프로젝트 목록
      </Link>
      <PageHeader title="새 프로젝트" />
      <ProjectForm projectId={null} initialValues={emptyProjectValues} />
    </div>
  );
}
