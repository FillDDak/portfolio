"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { flushSync } from "react-dom";
import { savePost } from "@/actions/content";
import type { ImageUploadResponse } from "@/app/api/admin/upload/image/route";
import { buttonClass } from "@/components/ui/button";
import { errorClass, fieldClass, helpClass, labelClass, textareaClass } from "@/components/ui/field";
import type { ActionResult } from "@/lib/action-result";
import {
  POST_BODY_TEMPLATES,
  POST_CATEGORIES,
  POST_CATEGORY_LABEL,
  type PostCategory,
} from "@/lib/post-category";
import { Panel } from "./page-header";
import { TechIconHint } from "./tech-icon-hint";

// 미리보기를 열 때만 Markdown 렌더러를 불러온다.
const Markdown = dynamic(() => import("@/components/markdown").then((mod) => mod.Markdown), {
  loading: () => <p className="text-muted">미리보기를 불러오는 중…</p>,
});

export type PostFormValues = {
  category: PostCategory;
  title: string;
  slug: string;
  summary: string;
  body: string;
  tags: string;
  date: string;
  isPublished: boolean;
  projectId: string;
};

export type ProjectOption = { id: number; title: string };

const splitTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

async function uploadImage(file: File): Promise<ImageUploadResponse> {
  const formData = new FormData();
  formData.set("file", file);
  try {
    const response = await fetch("/api/admin/upload/image", { method: "POST", body: formData });
    const result = (await response.json().catch(() => null)) as ImageUploadResponse | null;
    return result ?? { ok: false, message: "업로드 응답을 읽지 못했습니다." };
  } catch {
    return { ok: false, message: "네트워크 문제로 업로드하지 못했습니다." };
  }
}

export function PostForm({
  postId,
  initialValues,
  projects,
}: {
  postId: number | null;
  initialValues: PostFormValues;
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [saving, startSaving] = useTransition();
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // 새 글에서 제목을 입력하면 주소(slug) 초안을 채워 준다. 직접 고친 뒤에는 건드리지 않는다.
  const slugTouched = useRef(postId !== null || initialValues.slug !== "");

  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const set = <K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function handleCategoryChange(category: PostCategory) {
    setValues((current) => {
      // 본문이 아직 뼈대 그대로면 새 분류의 뼈대로 바꾼다.
      const untouched = Object.values(POST_BODY_TEMPLATES).includes(current.body);
      return { ...current, category, body: untouched ? POST_BODY_TEMPLATES[category] : current.body };
    });
  }

  async function handleTitleBlur() {
    if (slugTouched.current || values.slug) return;
    const { slugify } = await import("@/lib/validation/content");
    const draft = slugify(values.title);
    // 불러오는 사이에 주소를 직접 입력했으면 덮어쓰지 않는다.
    if (!draft || slugTouched.current) return;
    setValues((current) => (current.slug ? current : { ...current, slug: draft }));
  }

  /** 이미지를 올리고, 본문의 커서 위치에 Markdown 이미지 문법을 넣는다. */
  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;
    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? values.body.length;
    const end = textarea?.selectionEnd ?? start;
    // 넣은 뒤에도 보던 자리를 그대로 보여 주도록, 고르기 전의 입력칸·화면 스크롤 위치를 기억한다.
    const scrollTop = textarea?.scrollTop ?? 0;
    const pageScroll = { x: window.scrollX, y: window.scrollY };

    setUploading(true);
    setUploadError(null);
    const inserted: string[] = [];
    for (const file of files) {
      const uploaded = await uploadImage(file);
      if (!uploaded.ok) {
        setUploadError(`${file.name}: ${uploaded.message}`);
        break;
      }
      inserted.push(`![이미지 설명](/uploads/${uploaded.file})`);
    }
    setUploading(false);
    if (inserted.length === 0) return;

    const snippet = `\n${inserted.join("\n\n")}\n`;
    // 본문을 바로 화면에 반영한 뒤(flushSync) 커서와 스크롤을 맞춘다.
    // 값을 바꾸면 브라우저가 커서를 끝으로 옮기고 맨 아래로 스크롤하므로, 반영이 끝난 다음에 되돌려야 한다.
    flushSync(() =>
      setValues((current) => ({
        ...current,
        body: current.body.slice(0, start) + snippet + current.body.slice(end),
      })),
    );
    const target = bodyRef.current;
    if (!target) return;
    const position = start + snippet.length;
    target.focus({ preventScroll: true });
    target.setSelectionRange(position, position);
    target.scrollTop = scrollTop;
    window.scrollTo(pageScroll.x, pageScroll.y);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const payload = { ...values, tags: splitTags(values.tags) };

    startSaving(async () => {
      // 서버와 같은 스키마로 먼저 검증한다.
      const { postSchema, flattenErrors } = await import("@/lib/validation/content");
      const parsed = postSchema.safeParse(payload);
      if (!parsed.success) {
        setResult({
          ok: false,
          message: "입력한 내용을 다시 확인해 주세요.",
          fieldErrors: flattenErrors(parsed.error),
        });
        return;
      }
      try {
        const next = await savePost(postId, payload);
        setResult(next);
        if (next.ok) {
          if (postId === null && next.id) router.replace(`/admin/blog/${next.id}`);
          else router.refresh();
        }
      } catch {
        setResult({
          ok: false,
          message: "요청을 처리하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.",
        });
      }
    });
  }

  const fieldError = (name: string) =>
    errors[name] ? <p className={errorClass}>{errors[name]}</p> : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={saving}>
      <Panel title="기본 정보">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="post-category" className={labelClass}>
                분류
              </label>
              <select
                id="post-category"
                value={values.category}
                onChange={(event) => handleCategoryChange(event.target.value as PostCategory)}
                aria-invalid={Boolean(errors.category)}
                className={fieldClass}
              >
                {POST_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {POST_CATEGORY_LABEL[category]}
                  </option>
                ))}
              </select>
              {fieldError("category")}
            </div>
            <div>
              <label htmlFor="post-date" className={labelClass}>
                날짜
              </label>
              <input
                id="post-date"
                type="date"
                value={values.date}
                onChange={(event) => set("date", event.target.value)}
                aria-invalid={Boolean(errors.date)}
                className={fieldClass}
              />
              <p className={helpClass}>글에 표시되고, 목록은 이 날짜의 최신순입니다.</p>
              {fieldError("date")}
            </div>
          </div>
          <div>
            <label htmlFor="post-title" className={labelClass}>
              제목
            </label>
            <input
              id="post-title"
              value={values.title}
              onChange={(event) => set("title", event.target.value)}
              onBlur={handleTitleBlur}
              maxLength={120}
              placeholder="선착순 쿠폰 초과 발급 문제 해결"
              aria-invalid={Boolean(errors.title)}
              className={fieldClass}
            />
            {fieldError("title")}
          </div>
          <div>
            <label htmlFor="post-slug" className={labelClass}>
              주소 (slug)
            </label>
            <input
              id="post-slug"
              value={values.slug}
              onChange={(event) => {
                slugTouched.current = true;
                set("slug", event.target.value);
              }}
              maxLength={80}
              autoCapitalize="none"
              spellCheck={false}
              placeholder="coupon-over-issue"
              aria-invalid={Boolean(errors.slug)}
              className={`${fieldClass} font-mono`}
            />
            <p className={helpClass}>
              글 주소가 /blog/{values.slug || "주소"} 가 됩니다. 영문 소문자, 숫자, 하이픈만 쓸 수
              있습니다.
            </p>
            {fieldError("slug")}
          </div>
          <div>
            <label htmlFor="post-summary" className={labelClass}>
              요약
            </label>
            <textarea
              id="post-summary"
              value={values.summary}
              onChange={(event) => set("summary", event.target.value)}
              rows={2}
              maxLength={300}
              placeholder="동시 요청에서 재고보다 많이 발급되던 문제를 Redis 원자 연산으로 해결"
              aria-invalid={Boolean(errors.summary)}
              className={textareaClass}
            />
            <p className={helpClass}>목록 카드에 보입니다. 무엇을 어떻게 해결했는지 한두 줄로.</p>
            {fieldError("summary")}
          </div>
          <div>
            <label htmlFor="post-projectId" className={labelClass}>
              관련 프로젝트
            </label>
            <select
              id="post-projectId"
              value={values.projectId}
              onChange={(event) => set("projectId", event.target.value)}
              aria-invalid={Boolean(errors.projectId)}
              className={fieldClass}
            >
              <option value="">없음</option>
              {projects.map((project) => (
                <option key={project.id} value={String(project.id)}>
                  {project.title}
                </option>
              ))}
            </select>
            <p className={helpClass}>고르면 그 프로젝트 상세 페이지 아래에도 이 글이 보입니다.</p>
            {fieldError("projectId")}
          </div>
          <div>
            <label htmlFor="post-tags" className={labelClass}>
              태그
            </label>
            <input
              id="post-tags"
              value={values.tags}
              onChange={(event) => set("tags", event.target.value)}
              placeholder="Redis, 동시성"
              aria-invalid={Boolean(errors.tags)}
              className={fieldClass}
            />
            <p className={helpClass}>쉼표로 구분합니다. 아이콘이 있는 기술은 이름 앞에 로고가 붙습니다.</p>
            <TechIconHint inputId="post-tags" multiple />
            {fieldError("tags")}
          </div>
        </div>
      </Panel>

      <Panel title="본문">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" aria-label="본문 보기 방식" className="flex gap-1">
            {(
              [
                ["write", "작성"],
                ["preview", "미리보기"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`min-h-11 rounded-lg px-4 text-[0.9375rem] font-medium ${
                  tab === key ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-surface-2"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "write" ? (
            <label className={buttonClass("secondary", "cursor-pointer")}>
              {uploading ? "올리는 중…" : "이미지 넣기"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageChange}
                disabled={uploading}
                className="sr-only"
              />
            </label>
          ) : null}
        </div>
        {tab === "write" ? (
          <>
            <label htmlFor="post-body" className="sr-only">
              본문 (Markdown)
            </label>
            <textarea
              id="post-body"
              ref={bodyRef}
              value={values.body}
              onChange={(event) => set("body", event.target.value)}
              rows={24}
              spellCheck={false}
              className={`${textareaClass} font-mono text-[0.9375rem]`}
            />
            <p className={helpClass}>
              Markdown 으로 작성합니다. ## 로 소제목을 나누고, 표와 코드 블록을 쓸 수 있습니다.
              이미지는 ‘이미지 넣기’로 올리면 커서 위치에 들어가니, ‘이미지 설명’ 부분을 고쳐 주세요.
            </p>
          </>
        ) : (
          <div className="min-h-40 rounded-lg border border-line p-4">
            {values.body.trim() ? (
              <Markdown>{values.body}</Markdown>
            ) : (
              <p className="text-muted">본문이 비어 있습니다.</p>
            )}
          </div>
        )}
        {uploadError ? (
          <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3.5 py-2.5 text-[0.9375rem] font-medium text-danger">
            {uploadError}
          </p>
        ) : null}
        {fieldError("body")}
      </Panel>

      <Panel title="공개 설정">
        <label className="flex min-h-11 items-center gap-2.5">
          <input
            type="checkbox"
            checked={values.isPublished}
            onChange={(event) => set("isPublished", event.target.checked)}
            className="size-5 accent-(--accent)"
          />
          <span>공개 (체크하지 않으면 공개 페이지에 보이지 않습니다)</span>
        </label>
      </Panel>

      {/* 모바일에서 키보드가 올라와도 저장 버튼이 보이도록 화면 아래에 붙여 둔다. */}
      <div className="sticky bottom-0 -mx-4 border-t border-line bg-background/95 px-4 py-3 backdrop-blur-md lg:-mx-8 lg:px-8">
        <p
          role={result && !result.ok ? "alert" : "status"}
          className={
            !result?.message
              ? "sr-only"
              : result.ok
                ? "mb-2 text-[0.9375rem] font-medium text-success"
                : "mb-2 text-[0.9375rem] font-medium text-danger"
          }
        >
          {result?.message ?? ""}
        </p>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || uploading}
            className={buttonClass("primary", "flex-1 sm:flex-none sm:min-w-32")}
          >
            {saving ? "저장 중…" : "저장"}
          </button>
          {postId !== null && initialValues.isPublished ? (
            <a
              href={`/blog/${initialValues.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("secondary")}
            >
              공개 페이지 보기
            </a>
          ) : null}
        </div>
      </div>
    </form>
  );
}
