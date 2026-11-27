import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { PostForm, type PostFormValues } from "@/components/admin/post-form";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { toPostCategory } from "@/lib/post-category";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다(아래 layout.tsx 설명 참고).
export const instant = false;

export const metadata: Metadata = { title: "글 수정" };

export default async function EditPostPage({ params }: PageProps<"/admin/blog/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId <= 0) notFound();

  const [post, projects] = await Promise.all([
    db.post.findUnique({ where: { id: postId } }),
    db.project.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, title: true },
    }),
  ]);
  if (!post) notFound();

  const values: PostFormValues = {
    category: toPostCategory(post.category),
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    body: post.body,
    tags: post.tags,
    date: post.date,
    isPublished: post.isPublished,
    projectId: post.projectId ? String(post.projectId) : "",
  };

  return (
    <div className="max-w-3xl">
      <Link href="/admin/blog" className="mb-3 inline-flex min-h-11 items-center text-muted hover:text-foreground">
        ← 블로그
      </Link>
      <PageHeader
        title="글 수정"
        description="미리보기는 공개 페이지와 같은 화면을 비공개 상태에서도 보여 줍니다. 저장한 내용 기준이라, 고친 뒤에는 먼저 저장하세요."
        action={
          <a
            href={`/admin/preview/blog/${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("secondary")}
          >
            미리보기<span className="sr-only"> (새 탭에서 열림)</span>
          </a>
        }
      />
      {/* 다른 글로 이동하면 폼 상태를 새로 만든다. */}
      <PostForm key={post.id} postId={post.id} initialValues={values} projects={projects} />
    </div>
  );
}
