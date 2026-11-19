import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectArticle } from "@/components/public/project-article";
import { requireAdmin } from "@/lib/auth/guard";
import { PROJECT_DETAIL_INCLUDE, toProjectDetail } from "@/lib/data/public";
import { db } from "@/lib/db";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다((protected)/layout.tsx 설명 참고).
export const instant = false;

export const metadata: Metadata = { title: "프로젝트 미리보기" };

async function loadProject(id: string) {
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) return null;
  return db.project.findUnique({ where: { id: projectId }, include: PROJECT_DETAIL_INCLUDE });
}

/**
 * 프로젝트 미리보기: 공개 상세 페이지와 같은 화면을, 비공개 프로젝트까지 관리자만 볼 수 있게 보여 준다.
 * 캐시를 쓰지 않고 DB 에서 바로 읽으므로 저장한 직후의 내용이 보인다.
 * 관리자 메뉴 없이 공개 페이지 모양 그대로 보이도록 (protected) 레이아웃 밖에 둔다. 방문 통계도 보내지 않는다.
 */
export default async function ProjectPreviewPage({ params }: PageProps<"/admin/preview/projects/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const project = await loadProject(id);
  if (!project) notFound();

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-line bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-2.5 md:px-8">
          <p className="flex flex-wrap items-center gap-2 text-[0.9375rem]">
            <span className="rounded-md bg-accent px-2 py-0.5 text-[0.8125rem] font-bold text-white">미리보기</span>
            {project.isPublished ? (
              <span className="font-medium text-success">공개 중</span>
            ) : (
              <span className="font-medium text-muted">비공개 · 방문자에게는 보이지 않습니다</span>
            )}
            <span className="text-muted">· 저장한 내용 기준</span>
          </p>
          <div className="flex flex-wrap items-center gap-1">
            {project.isPublished ? (
              <a
                href={`/projects/${project.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center px-2 text-[0.9375rem] font-medium text-accent-ink underline underline-offset-2"
              >
                공개 페이지 열기
              </a>
            ) : null}
            <Link
              href={`/admin/projects/${project.id}`}
              className="inline-flex min-h-10 items-center px-2 text-[0.9375rem] font-medium text-muted hover:text-foreground"
            >
              수정 화면으로
            </Link>
          </div>
        </div>
      </div>
      {/* 공개 페이지와 같은 구조: 화면 폭을 채우는 main 안에서 가운데 정렬한다(바로 mx-auto 를 주면 내용 길이만큼 넓어진다). */}
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 pt-6 pb-16 md:px-8 md:pt-10 md:pb-24">
          <ProjectArticle project={toProjectDetail(project)} />
        </div>
      </main>
    </>
  );
}
