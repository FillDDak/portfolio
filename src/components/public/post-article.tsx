import Link from "next/link";
import { ArrowRightIcon, MailIcon } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { TechLabel } from "@/components/tech-label";
import { buttonClass } from "@/components/ui/button";
import type { PublicPost } from "@/lib/data/public";
import { formatDate } from "@/lib/format";
import { POST_CATEGORY_LABEL } from "@/lib/post-category";

/** 글 상세 본문. 공개 상세 페이지와 관리자 미리보기가 같은 화면을 쓴다. */
export function PostArticle({ post }: { post: PublicPost }) {
  return (
    <article className="fade-in mt-3">
      <header className="border-b border-line pb-6">
        <p className="flex flex-wrap items-center gap-x-2 text-[0.9375rem] text-muted">
          <span className="font-semibold text-accent-ink">{POST_CATEGORY_LABEL[post.category]}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={post.date} className="tabular-nums">
            {formatDate(post.date)}
          </time>
        </p>
        <h1 className="mt-2 text-[1.875rem] leading-tight font-bold tracking-tight md:text-[2.5rem]">
          {post.title}
        </h1>
        <p className="mt-3 text-lg text-muted md:text-xl">{post.summary}</p>

        {post.tags.length > 0 ? (
          <ul aria-label="태그" className="mt-5 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[0.8125rem] text-muted"
              >
                <TechLabel name={tag} />
              </li>
            ))}
          </ul>
        ) : null}

        {post.project ? (
          <Link
            href={`/projects/${post.project.slug}`}
            className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-line-strong"
          >
            <span className="min-w-0">
              <span className="block text-sm text-muted">관련 프로젝트</span>
              <span className="block font-semibold">{post.project.title}</span>
            </span>
            <ArrowRightIcon className="shrink-0 text-muted" />
          </Link>
        ) : null}
      </header>

      {post.body.trim() ? (
        <div className="mt-10">
          <Markdown>{post.body}</Markdown>
        </div>
      ) : null}

      <footer className="mt-12 flex flex-col gap-3 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">글에 대해 궁금한 점이 있다면 편하게 문의해 주세요.</p>
        <Link href="/#contact" className={buttonClass("primary", "shrink-0")}>
          <MailIcon />
          문의하기
        </Link>
      </footer>
    </article>
  );
}
