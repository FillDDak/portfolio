"use client";

import { useRef, useSyncExternalStore } from "react";
import { GridIcon, ListIcon } from "@/components/icons";
import type { PublicPostCard } from "@/lib/data/public";
import { clampPage, pageCount } from "@/lib/pagination";
import { POST_CATEGORIES, POST_CATEGORY_LABEL, type PostCategory } from "@/lib/post-category";
import { Pagination } from "./pagination";
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

/* ── 분류와 페이지: 주소(?category=note&page=2)에 둔다 ──────────────────
 * 뒤로 가기로 이전 페이지로 돌아갈 수 있고, 주소를 공유하면 같은 화면이 열린다.
 * 페이지는 미리 만들어 둔 정적 화면이라 서버는 항상 첫 페이지를 그리고, 브라우저에서 주소를 읽어 바꾼다.
 */
const PAGE_SIZE = 10;
const QUERY_EVENT = "blog-query-change";

type Filter = PostCategory | "ALL";

function subscribeQuery(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(QUERY_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(QUERY_EVENT, onChange);
  };
}

const readQuery = () => window.location.search;

function toFilter(value: string | null): Filter {
  const upper = value?.toUpperCase();
  return (POST_CATEGORIES as readonly string[]).includes(upper ?? "") ? (upper as PostCategory) : "ALL";
}

function queryHref(filter: Filter, page: number): string {
  const params = new URLSearchParams();
  if (filter !== "ALL") params.set("category", filter.toLowerCase());
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "/blog";
}

/**
 * 블로그 목록: 분류 필터, 목록형/카드형 전환 버튼, 목록, 페이지 번호. 서버에서는 '전체 · 목록형 · 1페이지'로 그린다.
 * 분류 필터는 글이 있는 분류가 둘 이상일 때만 보인다.
 */
export function PostListSwitcher({ posts }: { posts: PublicPostCard[] }) {
  const view = useSyncExternalStore(subscribe, readView, () => "list" as const);
  const search = useSyncExternalStore(subscribeQuery, readQuery, () => "");
  const listRef = useRef<HTMLDivElement>(null);

  const params = new URLSearchParams(search);
  const category = toFilter(params.get("category"));
  const categories = POST_CATEGORIES.map((value) => ({
    value,
    count: posts.filter((post) => post.category === value).length,
  })).filter((item) => item.count > 0);
  const filtered = category === "ALL" ? posts : posts.filter((post) => post.category === category);
  const last = pageCount(filtered.length, PAGE_SIZE);
  const page = clampPage(params.get("page"), last);
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const go = (nextFilter: Filter, nextPage: number, scroll: boolean) => {
    window.history.pushState(null, "", queryHref(nextFilter, nextPage));
    window.dispatchEvent(new Event(QUERY_EVENT));
    // 페이지를 넘기면 목록 맨 위부터 보이게 한다.
    if (scroll) listRef.current?.scrollIntoView({ block: "start" });
  };

  return (
    <div ref={listRef} className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {categories.length > 1 ? (
          <div role="group" aria-label="분류" className="flex flex-wrap gap-1.5">
            {[{ value: "ALL" as const, count: posts.length }, ...categories].map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={category === item.value}
                onClick={() => go(item.value, 1, false)}
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
      <Pagination
        page={page}
        last={last}
        hrefFor={(target) => queryHref(category, target)}
        onSelect={(target) => go(category, target, true)}
      />
    </div>
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
