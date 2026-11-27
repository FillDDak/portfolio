"use client";

import { useState, useSyncExternalStore } from "react";
import { GridIcon, ListIcon } from "@/components/icons";
import type { PublicPostCard } from "@/lib/data/public";
import { POST_CATEGORIES, POST_CATEGORY_LABEL, type PostCategory } from "@/lib/post-category";
import { PostList, type PostListView } from "./post-list";

const STORAGE_KEY = "blog-view";
const CHANGE_EVENT = "blog-view-change";

/** 고른 보기 방식은 이 브라우저에 기억해 두고, 다음에 들어와도 같은 방식으로 보여 준다. */
function readView(): PostListView {
  try {
    return localStorage.getItem(STORAGE_KEY) === "card" ? "card" : "list";
  } catch {
    return "list";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function saveView(view: PostListView) {
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // 저장할 수 없는 환경(사생활 보호 모드 등)이면 이번 화면에서만 바뀐다.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const OPTIONS = [
  { view: "list", label: "목록형", Icon: ListIcon },
  { view: "card", label: "카드형", Icon: GridIcon },
] as const;

/**
 * 블로그 목록: 분류 필터, 목록형/카드형 전환 버튼, 목록. 서버에서는 '전체 · 목록형'으로 그린다.
 * 분류 필터는 글이 있는 분류가 둘 이상일 때만 보인다.
 */
export function PostListSwitcher({ posts }: { posts: PublicPostCard[] }) {
  const view = useSyncExternalStore(subscribe, readView, () => "list" as const);
  const [category, setCategory] = useState<PostCategory | "ALL">("ALL");

  const categories = POST_CATEGORIES.map((value) => ({
    value,
    count: posts.filter((post) => post.category === value).length,
  })).filter((item) => item.count > 0);
  const shown = category === "ALL" ? posts : posts.filter((post) => post.category === category);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {categories.length > 1 ? (
          <div role="group" aria-label="분류" className="flex flex-wrap gap-1.5">
            {[{ value: "ALL" as const, count: posts.length }, ...categories].map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={category === item.value}
                onClick={() => setCategory(item.value)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-muted transition-colors hover:border-line-strong hover:text-foreground aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
              >
                {item.value === "ALL" ? "전체" : POST_CATEGORY_LABEL[item.value]}
                <span className="tabular-nums opacity-70">{item.count}</span>
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <ViewToggle view={view} />
      </div>
      <PostList posts={shown} view={view} />
    </>
  );
}

function ViewToggle({ view }: { view: PostListView }) {
  return (
    <div role="group" aria-label="보기 방식" className="ml-auto">
      <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
        {OPTIONS.map(({ view: option, label, Icon }) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => saveView(option)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted transition-colors hover:text-foreground aria-pressed:bg-surface-2 aria-pressed:text-foreground"
          >
            <Icon width={16} height={16} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
