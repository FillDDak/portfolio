import { readStored } from "@/lib/upload/storage";

/**
 * 업로드한 이미지를 내려준다. 주소: /uploads/<서버가 만든 파일명>.webp
 * 운영에서는 Nginx 가 같은 주소를 디스크에서 직접 서빙하므로 이 코드는 로컬 개발과 예비용이다.
 * 파일명이 바뀌지 않는 한 내용도 바뀌지 않으므로 오래 캐시한다.
 */
export async function GET(_request: Request, context: RouteContext<"/uploads/[name]">) {
  const { name } = await context.params;
  const stored = await readStored("images", name);
  if (!stored) {
    return new Response("Not Found", { status: 404 });
  }
  return new Response(new Uint8Array(stored.data), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(stored.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
