import type { Metadata } from "next";
import Link from "next/link";
import { deletePost, togglePostPublished } from "@/actions/content";
import { ActionForm, ConfirmDeleteButton, SubmitButton } from "@/components/admin/action-form";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { postCategoryLabel } from "@/lib/post-category";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다(아래 layout.tsx 설명 참고).
export const instant = false;

export const metadata: Metadata = { title: "블로그" };

export default async function PostsPage() {
  await requireAdmin();
  const posts = await db.post.findMany({
    orderBy: [{ date: "desc" }, { id: "desc" }],
    select: {
      id: true,
      category: true,
      title: true,
      slug: true,
      summary: true,
      date: true,
      isPublished: true,
      project: { select: { title: true } },
    },
  });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="블로그"
        description="트러블슈팅과 개발 노트. 날짜 최신순으로 표시되며, 프로젝트에 연결한 글은 그 프로젝트 상세 페이지에도 보입니다."
        action={
          <Link href="/admin/blog/new" className={buttonClass("primary")}>
            새 글
          </Link>
        }
      />

      {posts.length === 0 ? (
        <EmptyState>작성한 글이 없습니다. 공개한 글이 없으면 공개 페이지에 블로그 링크가 표시되지 않습니다.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[0.8125rem] font-semibold ${
                        post.isPublished ? "bg-success-soft text-success" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {post.isPublished ? "공개" : "비공개"}
                    </span>
                    <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[0.8125rem] font-semibold text-accent-ink">
                      {postCategoryLabel(post.category)}
                    </span>
                  </div>
                  <p className="text-lg font-bold tracking-tight">{post.title}</p>
                  <p className="text-muted">{post.summary}</p>
                  <p className="mt-1 text-sm text-muted tabular-nums">
                    {formatDate(post.date)}
                    {post.project ? ` · ${post.project.title}` : ""} ·{" "}
                    <span className="font-mono">/blog/{post.slug}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/admin/preview/blog/${post.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass("ghost")}
                  >
                    미리보기<span className="sr-only">: {post.title} (새 탭에서 열림)</span>
                  </a>
                  <Link href={`/admin/blog/${post.id}`} className={buttonClass("secondary")}>
                    수정
                  </Link>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <ActionForm action={togglePostPublished} showStatus={false}>
                  <input type="hidden" name="id" value={post.id} />
                  <SubmitButton variant="secondary" pendingText="변경 중…">
                    {post.isPublished ? "비공개로" : "공개로"}
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={deletePost} showStatus={false}>
                  <input type="hidden" name="id" value={post.id} />
                  <ConfirmDeleteButton title={`‘${post.title}’ 글을 삭제할까요?`} description="되돌릴 수 없습니다." />
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
