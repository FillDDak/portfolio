/** "2026-03" → "2026.03" */
export function formatMonth(value: string): string {
  return value.replace("-", ".");
}

/** 프로젝트 기간. 종료 월이 없으면 "진행 중"으로 표시한다. */
export function formatPeriod(startDate: string, endDate: string | null): string {
  return `${formatMonth(startDate)} – ${endDate ? formatMonth(endDate) : "진행 중"}`;
}

/** "2026-06-12" → "2026.06.12" */
export function formatDate(value: string): string {
  return value.replaceAll("-", ".");
}

/** "https://github.com/FillDDak" → "github.com/FillDDak" */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
}
