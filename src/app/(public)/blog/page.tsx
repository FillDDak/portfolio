import type { Metadata } from "next";
import { PostList } from "@/components/public/post-list";
import { getPublishedPosts } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "블로그",
  description: "프로젝트에서 겪은 문제와 해결 과정, 개발하며 정리한 내용",
  alternates: { canonical: "/blog" },
};

export default async function PostsPage() {
  // 공개한 글이 없으면 블로그 링크가 빠지지만, 주소로 직접 들어온 경우를 위해 빈 목록 안내를 둔다.
  const posts = await getPublishedPosts();

  return (
    <div className="mx-auto max-w-3xl px-5 pt-10 pb-16 md:px-8 md:pt-14 md:pb-24">
      <h1 className="text-[1.875rem] leading-tight font-bold tracking-tight md:text-[2.25rem]">블로그</h1>
      <p className="mt-2 text-muted">프로젝트에서 겪은 문제와 해결 과정, 개발하며 정리한 내용입니다.</p>
      <div className="mt-8">
        {posts.length > 0 ? (
          <PostList posts={posts} />
        ) : (
          <p className="border-y border-line py-10 text-center text-muted">아직 공개한 글이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
