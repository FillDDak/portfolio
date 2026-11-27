import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { PostForm, type PostFormValues } from "@/components/admin/post-form";
import { kstDate } from "@/lib/analytics/visitor";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { POST_BODY_TEMPLATES } from "@/lib/post-category";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다(아래 layout.tsx 설명 참고).
export const instant = false;

export const metadata: Metadata = { title: "새 글" };

/** ?project=3 으로 들어오면 그 프로젝트에 연결한 트러블슈팅 글로 시작한다(프로젝트 수정 화면의 '글 쓰기' 버튼). */
export default async function NewPostPage({ searchParams }: PageProps<"/admin/blog/new">) {
  await requireAdmin();
  const { project } = await searchParams;
  const projects = await db.project.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, title: true },
  });
  const linked = projects.find((item) => String(item.id) === project);

  const values: PostFormValues = {
    category: "TROUBLESHOOTING",
    title: "",
    slug: "",
    summary: "",
    body: POST_BODY_TEMPLATES.TROUBLESHOOTING,
    tags: "",
    date: kstDate(),
    isPublished: false,
    projectId: linked ? String(linked.id) : "",
  };

  return (
    <div className="max-w-3xl">
      <Link
        href={linked ? `/admin/projects/${linked.id}` : "/admin/blog"}
        className="mb-3 inline-flex min-h-11 items-center text-muted hover:text-foreground"
      >
        {linked ? `← ${linked.title}` : "← 블로그"}
      </Link>
      <PageHeader title="새 글" />
      <PostForm postId={null} initialValues={values} projects={projects} />
    </div>
  );
}
