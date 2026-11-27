"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { saveProject } from "@/actions/content";
import type { ImageUploadResponse } from "@/app/api/admin/upload/image/route";
import { buttonClass } from "@/components/ui/button";
import { errorClass, fieldClass, helpClass, labelClass, textareaClass } from "@/components/ui/field";
import type { ActionResult } from "@/lib/action-result";
import { Panel } from "./page-header";
import { TechIconHint } from "./tech-icon-hint";

// 미리보기를 열 때만 Markdown 렌더러를 불러온다.
const Markdown = dynamic(() => import("@/components/markdown").then((mod) => mod.Markdown), {
  loading: () => <p className="text-muted">미리보기를 불러오는 중…</p>,
});

export type ProjectFormValues = {
  title: string;
  slug: string;
  summary: string;
  role: string;
  teamSize: string;
  startDate: string;
  endDate: string;
  highlights: string;
  body: string;
  coverImage: string;
  demoUrl: string;
  githubUrl: string;
  docsUrl: string;
  isPublished: boolean;
  isFeatured: boolean;
  tags: string;
  images: { file: string; alt: string }[];
};

export const BODY_TEMPLATE = "## 문제\n\n\n\n## 해결\n\n\n\n## 결과\n\n";

export const emptyProjectValues: ProjectFormValues = {
  title: "",
  slug: "",
  summary: "",
  role: "",
  teamSize: "1",
  startDate: "",
  endDate: "",
  highlights: "",
  body: BODY_TEMPLATE,
  coverImage: "",
  demoUrl: "",
  githubUrl: "",
  docsUrl: "",
  isPublished: false,
  isFeatured: false,
  tags: "",
  images: [],
};

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

export function ProjectForm({
  projectId,
  initialValues,
}: {
  projectId: number | null;
  initialValues: ProjectFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [saving, startSaving] = useTransition();
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState<"cover" | "gallery" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // 새 프로젝트에서 제목을 입력하면 주소(slug) 초안을 채워 준다. 직접 고친 뒤에는 건드리지 않는다.
  const slugTouched = useRef(projectId !== null || initialValues.slug !== "");

  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const set = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function handleTitleBlur() {
    if (slugTouched.current || values.slug) return;
    const { slugify } = await import("@/lib/validation/content");
    const draft = slugify(values.title);
    // 불러오는 사이에 주소를 직접 입력했으면 덮어쓰지 않는다.
    if (!draft || slugTouched.current) return;
    setValues((current) => (current.slug ? current : { ...current, slug: draft }));
  }

  async function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading("cover");
    setUploadError(null);
    const uploaded = await uploadImage(file);
    setUploading(null);
    if (uploaded.ok) set("coverImage", uploaded.file);
    else setUploadError(uploaded.message);
  }

  async function handleGalleryChange(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;
    setUploading("gallery");
    setUploadError(null);
    for (const file of files) {
      const uploaded = await uploadImage(file);
      if (uploaded.ok) {
        setValues((current) => ({
          ...current,
          images: [...current.images, { file: uploaded.file, alt: "" }],
        }));
      } else {
        setUploadError(`${file.name}: ${uploaded.message}`);
        break;
      }
    }
    setUploading(null);
  }

  function moveImage(index: number, offset: -1 | 1) {
    setValues((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.images.length) return current;
      const images = [...current.images];
      const item = images[index];
      const other = images[target];
      if (!item || !other) return current;
      images[index] = other;
      images[target] = item;
      return { ...current, images };
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const payload = { ...values, tags: splitTags(values.tags) };

    startSaving(async () => {
      // 서버와 같은 스키마로 먼저 검증한다.
      const { projectSchema, flattenErrors } = await import("@/lib/validation/content");
      const parsed = projectSchema.safeParse(payload);
      if (!parsed.success) {
        setResult({
          ok: false,
          message: "입력한 내용을 다시 확인해 주세요.",
          fieldErrors: flattenErrors(parsed.error),
        });
        return;
      }
      try {
        const next = await saveProject(projectId, payload);
        setResult(next);
        if (next.ok) {
          if (projectId === null && next.id) router.replace(`/admin/projects/${next.id}`);
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
          <div>
            <label htmlFor="title" className={labelClass}>
              제목
            </label>
            <input
              id="title"
              value={values.title}
              onChange={(event) => set("title", event.target.value)}
              onBlur={handleTitleBlur}
              maxLength={100}
              aria-invalid={Boolean(errors.title)}
              className={fieldClass}
            />
            {fieldError("title")}
          </div>
          <div>
            <label htmlFor="slug" className={labelClass}>
              주소 (slug)
            </label>
            <input
              id="slug"
              value={values.slug}
              onChange={(event) => {
                slugTouched.current = true;
                set("slug", event.target.value);
              }}
              maxLength={80}
              autoCapitalize="none"
              spellCheck={false}
              placeholder="coupon-system"
              aria-invalid={Boolean(errors.slug)}
              className={`${fieldClass} font-mono`}
            />
            <p className={helpClass}>
              상세 페이지 주소가 /projects/{values.slug || "주소"} 가 됩니다. 영문 소문자, 숫자,
              하이픈만 쓸 수 있습니다.
            </p>
            {fieldError("slug")}
          </div>
          <div>
            <label htmlFor="summary" className={labelClass}>
              한 줄 요약
            </label>
            <input
              id="summary"
              value={values.summary}
              onChange={(event) => set("summary", event.target.value)}
              maxLength={200}
              aria-invalid={Boolean(errors.summary)}
              className={fieldClass}
            />
            {fieldError("summary")}
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <div>
              <label htmlFor="role" className={labelClass}>
                내 역할
              </label>
              <input
                id="role"
                value={values.role}
                onChange={(event) => set("role", event.target.value)}
                maxLength={100}
                placeholder="백엔드 (API 설계, 배포)"
                className={fieldClass}
              />
              {fieldError("role")}
            </div>
            <div>
              <label htmlFor="teamSize" className={labelClass}>
                인원
              </label>
              <input
                id="teamSize"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={values.teamSize}
                onChange={(event) => set("teamSize", event.target.value)}
                aria-invalid={Boolean(errors.teamSize)}
                className={fieldClass}
              />
              {fieldError("teamSize")}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="startDate" className={labelClass}>
                시작 월
              </label>
              <input
                id="startDate"
                type="month"
                value={values.startDate}
                onChange={(event) => set("startDate", event.target.value)}
                aria-invalid={Boolean(errors.startDate)}
                className={fieldClass}
              />
              {fieldError("startDate")}
            </div>
            <div>
              <label htmlFor="endDate" className={labelClass}>
                종료 월
              </label>
              <input
                id="endDate"
                type="month"
                value={values.endDate}
                onChange={(event) => set("endDate", event.target.value)}
                aria-invalid={Boolean(errors.endDate)}
                className={fieldClass}
              />
              <p className={helpClass}>비워 두면 “진행 중”으로 표시됩니다.</p>
              {fieldError("endDate")}
            </div>
          </div>
          <div>
            <label htmlFor="tags" className={labelClass}>
              스택 태그
            </label>
            <input
              id="tags"
              value={values.tags}
              onChange={(event) => set("tags", event.target.value)}
              placeholder="Java, Spring Boot, MySQL"
              aria-invalid={Boolean(errors.tags)}
              className={fieldClass}
            />
            <p className={helpClass}>쉼표로 구분합니다. 아이콘이 있는 기술은 이름 앞에 로고가 붙습니다.</p>
            <TechIconHint inputId="tags" multiple />
            {fieldError("tags")}
          </div>
          <div>
            <label htmlFor="highlights" className={labelClass}>
              핵심 성과
            </label>
            <textarea
              id="highlights"
              value={values.highlights}
              onChange={(event) => set("highlights", event.target.value)}
              rows={3}
              maxLength={600}
              placeholder={"평균 응답 시간 820ms → 95ms\n초과 발급 0건"}
              className={textareaClass}
            />
            <p className={helpClass}>한 줄에 하나씩, 수치가 들어가면 좋습니다. 카드에 그대로 표시됩니다.</p>
            {fieldError("highlights")}
          </div>
        </div>
      </Panel>

      <Panel title="본문">
        <div role="tablist" aria-label="본문 보기 방식" className="mb-3 flex gap-1">
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
          <>
            <label htmlFor="body" className="sr-only">
              본문 (Markdown)
            </label>
            <textarea
              id="body"
              value={values.body}
              onChange={(event) => set("body", event.target.value)}
              rows={18}
              spellCheck={false}
              className={`${textareaClass} font-mono text-[0.9375rem]`}
            />
            <p className={helpClass}>
              Markdown 으로 작성합니다. “문제 → 해결 → 결과” 순서를 권장하며, 표와 코드 블록을 쓸 수
              있습니다. 이미지는 아래 갤러리에 올린 뒤 표시되는 주소를 ![설명](주소) 형태로 넣으면
              됩니다.
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
        {fieldError("body")}
      </Panel>

      <Panel title="이미지">
        <div>
          <p className={labelClass}>대표 이미지</p>
          <p className={`${helpClass} mt-0 mb-2`}>
            아키텍처 다이어그램처럼 프로젝트를 한눈에 보여주는 이미지가 좋습니다. jpg, png, webp /
            5MB 이하.
          </p>
          {values.coverImage ? (
            <div className="mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- 관리자 미리보기 */}
              <img
                src={`/uploads/${values.coverImage}`}
                alt="대표 이미지 미리보기"
                className="max-h-56 rounded-lg border border-line"
              />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <label className={buttonClass("secondary", "cursor-pointer")}>
              {uploading === "cover" ? "올리는 중…" : values.coverImage ? "교체" : "이미지 선택"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverChange}
                disabled={uploading !== null}
                className="sr-only"
              />
            </label>
            {values.coverImage ? (
              <button type="button" onClick={() => set("coverImage", "")} className={buttonClass("danger")}>
                제거
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <p className={labelClass}>갤러리 이미지</p>
          <p className={`${helpClass} mt-0 mb-2`}>ERD, 화면 캡처 등. 여러 장을 한 번에 고를 수 있습니다.</p>
          {values.images.length > 0 ? (
            <ul className="mb-3 space-y-3">
              {values.images.map((image, index) => (
                <li key={image.file} className="flex flex-col gap-3 rounded-lg border border-line p-3 sm:flex-row">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 관리자 미리보기 */}
                  <img
                    src={`/uploads/${image.file}`}
                    alt=""
                    className="h-24 w-full rounded-md border border-line object-cover sm:w-36"
                  />
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`image-alt-${index}`} className={labelClass}>
                      이미지 설명 (대체 텍스트)
                    </label>
                    <input
                      id={`image-alt-${index}`}
                      value={image.alt}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          images: current.images.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, alt: event.target.value } : item,
                          ),
                        }))
                      }
                      maxLength={120}
                      placeholder="예: 쿠폰 발급 시스템 아키텍처"
                      className={fieldClass}
                    />
                    <p className={`${helpClass} font-mono break-all`}>/uploads/{image.file}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveImage(index, -1)}
                        disabled={index === 0}
                        aria-label={`${index + 1}번째 이미지 위로 이동`}
                        className={buttonClass("secondary", "size-11 px-0")}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === values.images.length - 1}
                        aria-label={`${index + 1}번째 이미지 아래로 이동`}
                        className={buttonClass("secondary", "size-11 px-0")}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setValues((current) => ({
                            ...current,
                            images: current.images.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                        className={buttonClass("danger")}
                      >
                        제거
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <label className={buttonClass("secondary", "cursor-pointer")}>
            {uploading === "gallery" ? "올리는 중…" : "이미지 추가"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleGalleryChange}
              disabled={uploading !== null}
              className="sr-only"
            />
          </label>
          {fieldError("images")}
        </div>

        {uploadError ? (
          <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3.5 py-2.5 text-[0.9375rem] font-medium text-danger">
            {uploadError}
          </p>
        ) : null}
      </Panel>

      <Panel title="링크">
        <div className="space-y-4">
          {(
            [
              ["demoUrl", "데모"],
              ["githubUrl", "GitHub"],
              ["docsUrl", "API 문서"],
            ] as const
          ).map(([name, label]) => (
            <div key={name}>
              <label htmlFor={name} className={labelClass}>
                {label}
              </label>
              <input
                id={name}
                type="url"
                inputMode="url"
                autoCapitalize="none"
                spellCheck={false}
                value={values[name]}
                onChange={(event) => set(name, event.target.value)}
                maxLength={300}
                placeholder="https://"
                aria-invalid={Boolean(errors[name])}
                className={fieldClass}
              />
              {fieldError(name)}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="공개 설정">
        <div className="space-y-1">
          <label className="flex min-h-11 items-center gap-2.5">
            <input
              type="checkbox"
              checked={values.isPublished}
              onChange={(event) => set("isPublished", event.target.checked)}
              className="size-5 accent-(--accent)"
            />
            <span>공개 (체크하지 않으면 공개 페이지에 보이지 않습니다)</span>
          </label>
          <label className="flex min-h-11 items-center gap-2.5">
            <input
              type="checkbox"
              checked={values.isFeatured}
              onChange={(event) => set("isFeatured", event.target.checked)}
              className="size-5 accent-(--accent)"
            />
            <span>대표 프로젝트 (목록 맨 위에 크게 표시됩니다)</span>
          </label>
        </div>
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
            disabled={saving || uploading !== null}
            className={buttonClass("primary", "flex-1 sm:flex-none sm:min-w-32")}
          >
            {saving ? "저장 중…" : "저장"}
          </button>
          {projectId !== null && values.isPublished ? (
            <a
              href={`/projects/${values.slug}`}
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
