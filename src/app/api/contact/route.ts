import { connection } from "next/server";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { MailNotConfiguredError, sendContactMail } from "@/lib/mail/contact-mail";
import { getSharedRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { contactSchema, toFieldErrors, type ContactFieldErrors } from "@/lib/validation/contact";

export type ContactResponse =
  | { ok: true }
  | {
      ok: false;
      code: "bad_request" | "validation" | "rate_limited" | "turnstile" | "send_failed";
      message: string;
      fieldErrors?: ContactFieldErrors;
    };

const MAX_REQUEST_BYTES = 32 * 1024;
const RATE_LIMIT = { limit: 3, windowMs: 10 * 60 * 1000 };
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

function json(body: ContactResponse, status: number, headers?: HeadersInit) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** 폼이 Turnstile 을 켜야 하는지 알려준다. 환경 변수는 빌드 시점이 아니라 요청 시점에 읽는다. */
export async function GET() {
  await connection();
  const env = getEnv();
  const enabled = Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY);
  return Response.json(
    { turnstileSiteKey: enabled ? env.TURNSTILE_SITE_KEY : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * 문의 전송: Zod 검증 → 스팸 검사 → DB 저장 → SMTP 발송.
 * 발송이 실패해도 DB 에는 남기고, 사용자에게는 실패했다고 분명히 알린다.
 */
export async function POST(request: Request) {
  const env = getEnv();

  // 1) 요청 본문 읽기
  const raw = await request.text();
  if (raw.length > MAX_REQUEST_BYTES) {
    return json({ ok: false, code: "bad_request", message: "요청이 너무 큽니다." }, 413);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ ok: false, code: "bad_request", message: "요청 형식이 올바르지 않습니다." }, 400);
  }

  // 2) 검증 (클라이언트와 같은 스키마)
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return json(
      {
        ok: false,
        code: "validation",
        message: "입력한 내용을 다시 확인해 주세요.",
        fieldErrors: toFieldErrors(parsed.error),
      },
      400,
    );
  }
  const input = parsed.data;

  // 3) 스팸 검사 ① 허니팟: 봇이 눈치채지 못하게 성공한 것처럼 응답하고 아무것도 하지 않는다.
  if (input.website !== "") {
    return json({ ok: true }, 200);
  }

  // 3) 스팸 검사 ② IP 당 요청 제한 (10분에 3회)
  const ip = getClientIp(request.headers, env.TRUSTED_PROXY_HOPS);
  const limiter = getSharedRateLimiter("contact", RATE_LIMIT);
  const rate = limiter.hit(`contact:${ip}`);
  if (!rate.allowed) {
    const minutes = Math.max(1, Math.ceil(rate.retryAfterSeconds / 60));
    return json(
      {
        ok: false,
        code: "rate_limited",
        message: `짧은 시간에 여러 번 보내셨습니다. 약 ${minutes}분 뒤에 다시 시도해 주세요.`,
      },
      429,
      { "Retry-After": String(rate.retryAfterSeconds) },
    );
  }

  // 3) 스팸 검사 ③ Turnstile (환경 변수가 둘 다 있을 때만)
  if (env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY) {
    const passed = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, input.turnstileToken, ip);
    if (!passed) {
      return json(
        {
          ok: false,
          code: "turnstile",
          message: "자동 입력 방지 확인에 실패했습니다. 확인 후 다시 보내 주세요.",
        },
        400,
      );
    }
  }

  // 4) DB 저장. 같은 내용을 방금 보냈다면 새로 만들지 않는다(중복 전송 방지).
  const duplicate = await db.contactMessage.findFirst({
    where: {
      email: input.email,
      subject: input.subject,
      body: input.body,
      createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
    orderBy: { id: "desc" },
  });
  if (duplicate?.mailStatus === "SENT") {
    return json({ ok: true }, 200);
  }

  const message =
    duplicate ??
    (await db.contactMessage.create({
      data: {
        name: input.name,
        email: input.email,
        organization: input.organization,
        subject: input.subject,
        body: input.body,
      },
    }));

  // 5) SMTP 발송
  try {
    await sendContactMail(input);
    await db.contactMessage.update({
      where: { id: message.id },
      data: { mailStatus: "SENT", mailError: "" },
    });
    return json({ ok: true }, 200);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await db.contactMessage.update({
      where: { id: message.id },
      data: { mailStatus: "FAILED", mailError: detail.slice(0, 500) },
    });
    if (!(error instanceof MailNotConfiguredError)) {
      console.error("[contact] 메일 발송 실패:", detail);
    } else {
      console.warn("[contact]", detail);
    }
    return json(
      {
        ok: false,
        code: "send_failed",
        message: "메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      502,
    );
  }
}

async function verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean> {
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip !== "unknown") body.set("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
