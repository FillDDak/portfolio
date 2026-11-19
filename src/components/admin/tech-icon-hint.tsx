"use client";

import { useEffect, useState } from "react";
import type { TechIconsResponse } from "@/app/api/admin/tech-icons/route";

type Icons = Record<string, { viewBox: string; path: string } | null>;

/** 입력이 멈춘 뒤 이만큼 기다렸다가 확인한다. */
const DEBOUNCE_MS = 300;

function splitNames(value: string, multiple: boolean): string[] {
  const names = multiple ? value.split(",") : [value];
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
}

/**
 * 기술 이름 입력칸 아래에, 공개 화면에서 각 이름 앞에 붙을 아이콘을 미리 보여 준다.
 * 입력칸은 그대로 두고 id 로 찾아 입력 이벤트만 듣는다(서버에서 그린 폼에도 붙일 수 있게).
 */
export function TechIconHint({ inputId, multiple = false }: { inputId: string; multiple?: boolean }) {
  const [names, setNames] = useState<string[]>([]);
  const [icons, setIcons] = useState<Icons>({});

  // 입력칸의 값을 따라간다. 처음 값도 읽는다.
  useEffect(() => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = () => setNames(splitNames(input.value, multiple));
    const onInput = () => {
      clearTimeout(timer);
      timer = setTimeout(read, DEBOUNCE_MS);
    };
    timer = setTimeout(read, 0);
    input.addEventListener("input", onInput);
    // 저장 후 폼이 비워질 때(reset)도 따라간다.
    input.form?.addEventListener("reset", onInput);
    return () => {
      clearTimeout(timer);
      input.removeEventListener("input", onInput);
      input.form?.removeEventListener("reset", onInput);
    };
  }, [inputId, multiple]);

  // 아직 확인하지 않은 이름만 서버에 묻는다.
  useEffect(() => {
    const missing = names.filter((name) => !(name in icons));
    if (missing.length === 0) return;
    const controller = new AbortController();
    fetch(`/api/admin/tech-icons?names=${encodeURIComponent(missing.join(","))}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<TechIconsResponse>)
      .then((result) => {
        if (result.ok) setIcons((previous) => ({ ...previous, ...result.icons }));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [names, icons]);

  const known = names.filter((name) => name in icons);
  if (known.length === 0) return null;

  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted" data-testid={`tech-icon-hint-${inputId}`}>
      <span>아이콘 미리보기:</span>
      {known.map((name) => {
        const icon = icons[name];
        return (
          <span
            key={name}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
              icon ? "bg-surface-2 text-foreground" : "border border-dashed border-line-strong"
            }`}
          >
            {icon ? (
              <svg viewBox={icon.viewBox} fill="currentColor" aria-hidden="true" className="size-[1.0625em] shrink-0">
                <path d={icon.path} />
              </svg>
            ) : null}
            {name}
            {icon ? null : <span className="text-[0.8125rem]">(아이콘 없음)</span>}
          </span>
        );
      })}
    </p>
  );
}
