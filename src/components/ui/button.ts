const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[0.9375rem] font-semibold " +
  "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary:
    "border border-line-strong bg-surface text-foreground hover:border-foreground/40 hover:bg-surface-2",
  ghost: "text-foreground hover:bg-surface-2",
  danger: "border border-danger/40 bg-surface text-danger hover:bg-danger-soft",
} as const;

export type ButtonVariant = keyof typeof variants;

/** 버튼과 버튼 모양 링크에 공통으로 쓰는 클래스. 터치 영역은 최소 44px. */
export function buttonClass(variant: ButtonVariant = "secondary", extra = ""): string {
  return `${base} ${variants[variant]} ${extra}`.trim();
}
