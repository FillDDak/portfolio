/** Markdown 이미지: ![설명](주소) 또는 ![설명](주소 "제목"), 주소를 <> 로 감싼 형태도 받는다. */
const MARKDOWN_IMAGE = /!\[[^\]]*\]\(\s*<?([^\s>)]+)>?(?:\s+["'][^"']*["'])?\s*\)/;

/**
 * 글 본문의 첫 이미지 주소. 목록의 썸네일로 쓴다. 없으면 null.
 * 이 사이트에 올린 이미지(/uploads/...)와 https 주소만 쓴다(그 밖의 주소는 본문에서도 쓰지 않는 게 맞다).
 * 코드 블록 안의 예시 문법은 이미지가 아니므로 먼저 걷어 낸다.
 */
export function firstImageUrl(body: string): string | null {
  const text = body.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g, "");
  const url = text.match(MARKDOWN_IMAGE)?.[1];
  if (!url) return null;
  return /^\/uploads\/[\w.-]+$/.test(url) || /^https:\/\/[^\s"'<>]+$/.test(url) ? url : null;
}
