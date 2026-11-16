import { revalidateTag } from "next/cache";
import { isBootToken } from "@/lib/boot-token";
import { ALL_CACHE_TAGS } from "@/lib/data/public";

/**
 * 공개 페이지의 캐시를 모두 비운다. 서버가 시작 직후 자기 자신에게만 호출한다(src/instrumentation.ts).
 *
 * 필요한 이유: 공개 페이지는 빌드할 때 미리 만들어지는데, 그때 쓰인 DB(CI 의 빈 DB)와 운영 DB 의 내용이 다르다.
 * 그대로 두면 배포 직후 빌드 시점의 내용이 보이므로, 시작하자마자 캐시를 비워 운영 DB 로 다시 만들게 한다.
 */
export async function POST(request: Request) {
  if (!isBootToken(request.headers.get("x-boot-token"))) {
    return new Response("Not Found", { status: 404 });
  }
  for (const tag of ALL_CACHE_TAGS) {
    revalidateTag(tag, { expire: 0 });
  }
  return Response.json({ ok: true, tags: ALL_CACHE_TAGS });
}
