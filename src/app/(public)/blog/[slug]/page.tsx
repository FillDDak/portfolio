import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostArticle } from "@/components/public/post-article";
import { getPublishedPost } from "@/lib/data/public";
import { SITE_MARK } from "@/lib/site";

type Props = PageProps<"/blog/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "글을 찾을 수 없습니다" };
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      siteName: SITE_MARK,
      locale: "ko_KR",
      title: post.title,
      description: post.summary,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
      modifiedTime: post.updatedAt,
      tags: post.tags,
    },
  };
}

export default function PostPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-6 pb-16 md:px-8 md:pt-10 md:pb-24">
      <Link
        href="/blog"
        className="-ml-1 inline-flex min-h-11 items-center px-1 text-[0.9375rem] font-medium text-muted hover:text-foreground"
      >
        ← 블로그
      </Link>
      {/* 주소의 slug 는 요청 시점에 정해지므로 Suspense 안에서 읽는다. */}
      <Suspense fallback={<PostSkeleton />}>
        <PostContent params={params} />
      </Suspense>
    </div>
  );
}

async function PostContent({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();
  return <PostArticle post={post} />;
}

function PostSkeleton() {
  return (
    <div className="mt-3" aria-busy="true" aria-label="글을 불러오는 중">
      <div className="h-5 w-40 rounded-lg bg-surface-2" />
      <div className="mt-3 h-10 w-3/4 rounded-lg bg-surface-2" />
      <div className="mt-4 h-6 w-full rounded-lg bg-surface-2" />
      <div className="mt-10 h-64 w-full rounded-lg bg-surface-2" />
    </div>
  );
}
