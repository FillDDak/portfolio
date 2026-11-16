/** 관리자 폼에서 공통으로 쓰는 입력 칸 스타일. iOS 확대를 막기 위해 글자 크기는 16px. */
export const labelClass = "mb-1.5 block text-[0.9375rem] font-medium";

export const fieldClass =
  "block min-h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-base text-foreground " +
  "placeholder:text-muted/70 focus:border-accent-ink focus:outline-2 focus:outline-offset-0 focus:outline-accent-ink/30 " +
  "aria-[invalid=true]:border-danger";

export const textareaClass = `${fieldClass} py-2.5 leading-[1.7]`;

export const helpClass = "mt-1.5 text-sm text-muted";

export const errorClass = "mt-1.5 text-sm font-medium text-danger";
