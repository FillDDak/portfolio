/** 페이지 번호 줄에 보일 항목. "gap" 은 건너뛴 구간(…)이다. */
export type PageItem = number | "gap";

/** 전체 페이지 수(최소 1) */
export const pageCount = (total: number, size: number) => Math.max(1, Math.ceil(total / size));

/** 주소의 page 값을 1 ~ last 사이의 정수로 맞춘다. 숫자가 아니면 1. */
export function clampPage(value: string | null, last: number): number {
  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) return 1;
  return Math.min(page, last);
}

/**
 * 첫 페이지, 마지막 페이지, 현재 페이지 앞뒤 하나씩을 보여 주고 나머지는 … 으로 줄인다.
 * 항목 수가 일정해서(최대 7개) 페이지를 옮겨도 줄의 폭이 크게 흔들리지 않는다.
 *   1 2 3 4 5 … 12 / 1 … 5 6 7 … 12 / 1 … 8 9 10 11 12
 */
export function pageItems(current: number, last: number): PageItem[] {
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "gap", last];
  if (current >= last - 3) return [1, "gap", last - 4, last - 3, last - 2, last - 1, last];
  return [1, "gap", current - 1, current, current + 1, "gap", last];
}
