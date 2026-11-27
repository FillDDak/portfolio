/** 헤더 왼쪽 위에 표시하는 사이트 이름(도메인) */
export const SITE_MARK = "fillddak.kr";

/**
 * 사이트 주소(끝에 슬래시 없음). canonical, sitemap, Open Graph 의 절대 주소를 만들 때 쓴다.
 * 다른 환경 변수가 없어도 읽을 수 있게 process.env 에서 직접 읽는다.
 */
export function getSiteUrl(): string {
  const value = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (value && /^https?:\/\//.test(value)) return value;
  return "http://localhost:3000";
}

type PersonInput = {
  name: string;
  jobTitle: string;
  tagline: string;
  githubUrl: string;
  velogUrl: string;
};

/** 검색 엔진용 구조화 데이터(schema.org Person) */
export function buildPersonJsonLd(profile: PersonInput, siteUrl: string) {
  const sameAs = [profile.githubUrl, profile.velogUrl].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.jobTitle,
    ...(profile.tagline ? { description: profile.tagline } : {}),
    url: siteUrl,
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/** JSON-LD 를 <script> 안에 넣을 문자열로 바꾼다. "<" 를 이스케이프해 태그가 닫히지 않게 한다. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
