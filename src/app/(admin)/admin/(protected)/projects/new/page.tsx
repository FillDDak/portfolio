import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { emptyProjectValues, ProjectForm } from "@/components/admin/project-form";
import { requireAdmin } from "@/lib/auth/guard";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다(아래 layout.tsx 설명 참고).
export const instant = false;

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
