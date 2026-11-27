import Link from "next/link";
import type { PublicPostCard } from "@/lib/data/public";
import { formatDate } from "@/lib/format";
import { POST_CATEGORY_LABEL } from "@/lib/post-category";

export type PostListView = "list" | "card";

type Props = {
  posts: PublicPostCard[];
  headingLevel?: "h2" | "h3";
  showProject?: boolean;
  view?: PostListView;
};

/**
 * 글 목록.
 * - list: 한 줄에 글 하나씩. 본문에 이미지가 있으면 오른쪽에 작은 썸네일을 둔다.
 * - card: 썸네일이 위에 크게 보이는 카드 격자. 이미지가 없는 글은 분류 이름을 넣은 빈 칸으로 높이를 맞춘다.
 * 항목 전체가 글로 가는 링크다(제목 링크의 영역을 항목 전체로 넓힘).
 * showProject=false 는 프로젝트 상세 페이지 안처럼 프로젝트 이름이 뻔한 곳에서 쓴다.
 */
export function PostList({ posts, headingLevel = "h2", showProject = true, view = "list" }: Props) {
  if (view === "card") {
    return (
      <ul className="grid gap-4 sm:grid-cols-2 md:gap-5">
        {posts.map((post) => (
          <li key={post.id} className="flex">
            <article className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors duration-150 hover:border-line-strong">
              <Thumbnail post={post} className="aspect-[16/9] w-full border-b border-line" />
              <div className="flex flex-1 flex-col p-5">
                <Meta post={post} />
                <Title post={post} headingLevel={headingLevel} rounded="after:rounded-xl" />
                <p className="mt-1.5 line-clamp-3 text-[0.9375rem] text-muted">{post.summary}</p>
                {showProject && post.project ? (
                  <p className="mt-auto pt-3 text-sm text-muted">관련 프로젝트 · {post.project.title}</p>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {posts.map((post) => (
        <li key={post.id}>
          <article className="group relative flex items-start gap-4 py-5 md:gap-6 md:py-6">
            <div className="min-w-0 flex-1">
              <Meta post={post} />
              <Title post={post} headingLevel={headingLevel} rounded="after:rounded-lg" />
              <p className="mt-1.5 text-muted">{post.summary}</p>
              {showProject && post.project ? (
                <p className="mt-2 text-sm text-muted">관련 프로젝트 · {post.project.title}</p>
              ) : null}
            </div>
            {post.thumbnail ? (
              <Thumbnail post={post} className="mt-1 aspect-[4/3] w-24 shrink-0 rounded-lg border border-line sm:w-36 md:w-44" />
            ) : null}
          </article>
        </li>
      ))}
    </ul>
  );
}

function Meta({ post }: { post: PublicPostCard }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
      <span className={`font-semibold ${post.category === "TROUBLESHOOTING" ? "text-accent-ink" : "text-foreground"}`}>
        {POST_CATEGORY_LABEL[post.category]}
      </span>
      <span aria-hidden="true">·</span>
      <time dateTime={post.date} className="tabular-nums">
        {formatDate(post.date)}
      </time>
    </p>
  );
}

function Title({
  post,
  headingLevel,
  rounded,
}: {
  post: PublicPostCard;
  headingLevel: "h2" | "h3";
  rounded: string;
}) {
  const Heading = headingLevel;
  return (
    <Heading className="mt-1.5 text-lg font-bold tracking-tight md:text-xl">
      <Link
        href={`/blog/${post.slug}`}
        className={`after:absolute after:inset-0 group-hover:text-accent-ink focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent-ink ${rounded}`}
      >
        {post.title}
      </Link>
    </Heading>
  );
}

/** 썸네일은 제목이 이미 링크 이름이라 꾸밈 이미지로 둔다(alt=""). */
function Thumbnail({ post, className }: { post: PublicPostCard; className: string }) {
  if (!post.thumbnail) {
    return (
      <div aria-hidden="true" className={`flex items-center justify-center bg-surface-2 ${className}`}>
        <span className="font-mono text-sm font-medium text-muted">{POST_CATEGORY_LABEL[post.category]}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 업로드 시 이미 webp 로 변환한 이미지다
    <img
      src={post.thumbnail}
      alt=""
      loading="lazy"
      decoding="async"
      className={`bg-surface-2 object-cover ${className}`}
    />
  );
}
