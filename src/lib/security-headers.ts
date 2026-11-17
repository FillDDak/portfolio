/**
 * 모든 응답에 붙이는 보안 헤더. next.config.ts 의 headers() 에서 쓴다.
 *
 * CSP 는 nonce 를 쓰지 않는 방식이다. nonce 를 쓰려면 모든 페이지를 요청마다 새로 그려야 해서
 * 미리 만들어 둔 정적 페이지를 쓸 수 없다. 대신 script-src 에 'unsafe-inline' 을 허용하고,
 * 방문자 입력을 HTML 로 내보내는 곳(Markdown 본문)은 rehype-sanitize 로 걸러 낸다.
 * HSTS 는 HTTPS 를 처리하는 Nginx 에서 붙인다.
 */

// 문의 폼의 Turnstile(환경 변수로 켰을 때만 실제로 쓰인다)
const TURNSTILE = "https://challenges.cloudflare.com";

export function buildContentSecurityPolicy(options: { isDev: boolean }): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 개발 서버는 디버깅용으로 eval 을 쓴다.
    "script-src": ["'self'", "'unsafe-inline'", TURNSTILE, ...(options.isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    // 프로젝트 본문(Markdown)에 다른 사이트의 이미지를 넣을 수 있게 https 이미지는 허용한다.
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(options.isDev ? ["ws:"] : [])],
    // PDF 미리보기(<object>)는 내 사이트의 파일만 띄운다.
    "object-src": ["'self'"],
    "frame-src": ["'self'", TURNSTILE],
    "frame-ancestors": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function buildSecurityHeaders(options: { isDev: boolean }): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(options) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
  ];
}
