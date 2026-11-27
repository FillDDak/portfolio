import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

/**
 * 프로젝트 본문(Markdown) 표시.
 * - 코드를 실행하는 MDX 가 아니라 일반 Markdown 만 지원한다.
 * - rehype-sanitize 가 script, iframe, on* 속성, javascript: 주소 등을 제거한다.
 * - 공개 페이지와 관리자 미리보기가 같은 컴포넌트를 써서 보이는 결과가 같다.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // 표와 코드는 화면 밖으로 넘치지 않게 안에서 가로 스크롤한다.
          table: ({ children: content }) => (
            <div className="table-scroll" tabIndex={0} role="region" aria-label="표">
              <table>{content}</table>
            </div>
          ),
          a: ({ href, children: content }) => {
            const external = typeof href === "string" && /^https?:\/\//.test(href);
            return (
              <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {content}
              </a>
            );
          },
          // eslint-disable-next-line @next/next/no-img-element -- 본문 이미지는 크기를 미리 알 수 없다
          img: ({ src, alt }) => <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" decoding="async" />,
          // 페이지 제목(h1)은 하나만 두므로 본문의 # 은 h2 로 내리되, ## 보다 크게 보이게 따로 꾸민다.
          // 글자 크기: # > ## > ### > #### (globals.css 의 .prose-content 참고)
          h1: ({ children: content }) => <h2 className="md-h1">{content}</h2>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
