import type { Metadata } from "next";
import Link from "next/link";
import { deleteProject, moveProject, toggleProjectFlag } from "@/actions/content";
import {
  ActionForm,
  ConfirmDeleteButton,
  MoveButtons,
  SubmitButton,
} from "@/components/admin/action-form";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { formatPeriod } from "@/lib/format";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다(아래 layout.tsx 설명 참고).
export const instant = false;

export const metadata: Metadata = { title: "프로젝트" };

export default async function ProjectsPage() {
  await requireAdmin();
  const projects = await db.project.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      startDate: true,
      endDate: true,
      isPublished: true,
      isFeatured: true,
    },
  });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="프로젝트"
        description="위에서부터 순서대로 표시됩니다. 대표 프로젝트는 순서와 상관없이 항상 먼저 나옵니다."
        action={
          <Link href="/admin/projects/new" className={buttonClass("primary")}>
            새 프로젝트
          </Link>
        }
      />

      {projects.length === 0 ? (
        <EmptyState>
          등록한 프로젝트가 없습니다. 프로젝트 섹션은 공개 페이지에 표시되지 않습니다.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {projects.map((project, index) => (
            <li key={project.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[0.8125rem] font-semibold ${
                        project.isPublished ? "bg-success-soft text-success" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {project.isPublished ? "공개" : "비공개"}
                    </span>
                    {project.isFeatured ? (
                      <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[0.8125rem] font-semibold text-accent-ink">
                        대표
                      </span>
                    ) : null}
                  </div>
                  <p className="text-lg font-bold tracking-tight">{project.title}</p>
                  <p className="text-muted">{project.summary}</p>
                  <p className="mt-1 text-sm text-muted tabular-nums">
                    {formatPeriod(project.startDate, project.endDate)} ·{" "}
                    <span className="font-mono">/projects/{project.slug}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/admin/preview/projects/${project.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass("ghost")}
                  >
                    미리보기<span className="sr-only">: {project.title} (새 탭에서 열림)</span>
                  </a>
                  <Link href={`/admin/projects/${project.id}`} className={buttonClass("secondary")}>
                    수정
                  </Link>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <MoveButtons
                    action={moveProject}
                    id={project.id}
                    isFirst={index === 0}
                    isLast={index === projects.length - 1}
                    label={project.title}
                  />
                  <ActionForm action={toggleProjectFlag} showStatus={false}>
                    <input type="hidden" name="id" value={project.id} />
                    <input type="hidden" name="flag" value="isPublished" />
                    <SubmitButton variant="secondary" pendingText="변경 중…">
                      {project.isPublished ? "비공개로" : "공개로"}
                    </SubmitButton>
                  </ActionForm>
                  <ActionForm action={toggleProjectFlag} showStatus={false}>
                    <input type="hidden" name="id" value={project.id} />
                    <input type="hidden" name="flag" value="isFeatured" />
                    <SubmitButton variant="secondary" pendingText="변경 중…">
                      {project.isFeatured ? "대표 해제" : "대표로"}
                    </SubmitButton>
                  </ActionForm>
                </div>
                <ActionForm action={deleteProject} showStatus={false}>
                  <input type="hidden" name="id" value={project.id} />
                  <ConfirmDeleteButton
                    title={`‘${project.title}’ 프로젝트를 삭제할까요?`}
                    description="본문과 이미지가 모두 삭제되며 되돌릴 수 없습니다."
                  />
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
