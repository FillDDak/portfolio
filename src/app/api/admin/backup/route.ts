import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { connection } from "next/server";
import { z } from "zod";
import { requireAdminForApi, UnauthorizedError } from "@/lib/auth/guard";
import { getLoginGuard } from "@/lib/auth/login-guard";
import { verifyAdminLogin } from "@/lib/auth/password";
import { backupFileName, createBackupArchive } from "@/lib/backup/archive";
import { getEnv } from "@/lib/env";
import { getSharedRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export type BackupErrorResponse = { ok: false; message: string };

function fail(message: string, status: number) {
  return Response.json({ ok: false, message } satisfies BackupErrorResponse, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

const bodySchema = z.object({ password: z.string().min(1).max(200) });

/**
 * 지금 시점의 백업(DB 사본 + 업로드 파일)을 tar.gz 로 내려준다.
 * 문의한 사람의 개인정보가 들어 있으므로 로그인한 상태에서도 비밀번호를 한 번 더 확인한다.
 * - 비밀번호를 틀리면 로그인 실패와 같이 센다(같은 IP 에서 15분에 5번 틀리면 로그인까지 잠김).
 * - 내려받기는 IP 당 1시간에 10번까지.
 */
export async function POST(request: Request) {
  await connection();
  try {
    const session = await requireAdminForApi();
    const env = getEnv();
    const ip = getClientIp(request.headers, env.TRUSTED_PROXY_HOPS);

    const guard = getLoginGuard();
    if (!guard.check(ip).allowed) {
      return fail("비밀번호를 여러 번 틀려 잠시 잠겼습니다. 나중에 다시 시도해 주세요.", 429);
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("비밀번호를 입력해 주세요.", 400);

    const ok = await verifyAdminLogin(
      { username: session.username, password: parsed.data.password },
      { username: env.ADMIN_USERNAME, passwordHashB64: env.ADMIN_PASSWORD_HASH_B64 },
    );
    if (!ok) {
      const failure = guard.recordFailure(ip);
      console.warn(`[backup] 내려받기 비밀번호 틀림 (남은 시도 ${failure.remaining}회)`);
      return failure.remaining <= 0
        ? fail("비밀번호를 여러 번 틀려 잠시 잠겼습니다. 나중에 다시 시도해 주세요.", 429)
        : fail(`비밀번호가 올바르지 않습니다. (남은 시도 ${failure.remaining}회)`, 403);
    }
    guard.recordSuccess(ip);

    const limiter = getSharedRateLimiter("backup-download", { limit: 10, windowMs: 60 * 60 * 1000 });
    if (!limiter.hit(`backup:${ip}`).allowed) {
      return fail("백업은 1시간에 10번까지 내려받을 수 있습니다.", 429);
    }

    const archive = await createBackupArchive();
    const fileName = backupFileName(new Date());
    console.log(`[backup] 관리자가 백업을 내려받았습니다: ${fileName} (${archive.size} bytes)`);

    // 다 보냈거나 중간에 끊기면 임시 파일을 지운다.
    const file = createReadStream(/* turbopackIgnore: true */ archive.path);
    file.once("close", () => void archive.cleanup());
    return new Response(Readable.toWeb(file) as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Length": String(archive.size),
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail(error.message, 401);
    console.error("[backup] 백업 만들기 실패", error);
    return fail("백업을 만들지 못했습니다. 서버 로그를 확인해 주세요.", 500);
  }
}
