import Link from "next/link";
import type { PublicPostCard } from "@/lib/data/public";
import { formatDate } from "@/lib/format";
import { POST_CATEGORY_LABEL } from "@/lib/post-category";

/**
 * 글 목록. 한 줄에 글 하나씩: 분류·날짜, 제목, 요약, (있으면) 관련 프로젝트.
 * 줄 전체가 글로 가는 링크다(제목 링크의 영역을 줄 전체로 넓힘).
 * showProject=false 는 프로젝트 상세 페이지 안처럼 프로젝트 이름이 뻔한 곳에서 쓴다.
 */
export function PostList({
  posts,
  headingLevel = "h2",
  showProject = true,
}: {
  posts: PublicPostCard[];
  headingLevel?: "h2" | "h3";
  showProject?: boolean;
}) {
  const Heading = headingLevel;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {posts.map((post) => (
        <li key={post.id}>
          <article className="group relative py-5 md:py-6">
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <span
                className={`font-semibold ${post.category === "TROUBLESHOOTING" ? "text-accent-ink" : "text-foreground"}`}
              >
                {POST_CATEGORY_LABEL[post.category]}
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.date} className="tabular-nums">
                {formatDate(post.date)}
              </time>
            </p>
            <Heading className="mt-1.5 text-lg font-bold tracking-tight md:text-xl">
              <Link
                href={`/blog/${post.slug}`}
                className="after:absolute after:inset-0 group-hover:text-accent-ink focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent-ink"
              >
                {post.title}
              </Link>
            </Heading>
            <p className="mt-1.5 text-muted">{post.summary}</p>
            {showProject && post.project ? (
              <p className="mt-2 text-sm text-muted">관련 프로젝트 · {post.project.title}</p>
            ) : null}
          </article>
        </li>
      ))}
    </ul>
  );
}
