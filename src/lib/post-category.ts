/**
 * 글 분류. 목록의 표시 순서이기도 하다.
 * 관리자 폼(클라이언트)에서도 쓰므로 zod 를 끌어오지 않게 검증 스키마와 따로 둔다.
 */
export const POST_CATEGORIES = ["TROUBLESHOOTING", "NOTE"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];
export const POST_CATEGORY_LABEL: Record<PostCategory, string> = {
  TROUBLESHOOTING: "트러블슈팅",
  NOTE: "개발 노트",
};

/** DB 에 저장된 값을 분류로 바꾼다. 모르는 값은 개발 노트로 본다. */
export function toPostCategory(value: string): PostCategory {
  return (POST_CATEGORIES as readonly string[]).includes(value) ? (value as PostCategory) : "NOTE";
}

export const postCategoryLabel = (value: string) => POST_CATEGORY_LABEL[toPostCategory(value)];

/**
 * 분류별 본문 뼈대. 새 글은 이 내용으로 시작한다.
 * 새 글 화면(서버 컴포넌트)과 폼(클라이언트)이 함께 쓰므로 "use client" 파일이 아닌 여기에 둔다.
 */
export const POST_BODY_TEMPLATES: Record<PostCategory, string> = {
  TROUBLESHOOTING: "## 문제 상황\n\n\n\n## 원인\n\n\n\n## 해결\n\n\n\n## 결과\n\n",
  NOTE: "",
};
