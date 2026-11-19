import nodemailer from "nodemailer";
import { getEnv } from "@/lib/env";

export type ContactMailInput = {
  name: string;
  email: string;
  organization: string;
  subject: string;
  body: string;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** 메일 제목과 본문(text, html)을 만든다. 방문자가 입력한 값은 HTML 에 넣기 전에 모두 이스케이프한다. */
export function buildContactMail(input: ContactMailInput) {
  const organization = input.organization || "(입력하지 않음)";
  const subject = `[포트폴리오 문의] ${input.subject}`;

  const text = [
    `이름: ${input.name}`,
    `소속: ${organization}`,
    `메일 주소: ${input.email}`,
    `제목: ${input.subject}`,
    "",
    "──────── 내용 ────────",
    input.body,
    "",
    "이 메일에 답장하면 문의하신 분의 메일 주소로 바로 회신됩니다.",
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><th align="left" style="padding:6px 16px 6px 0;color:#566070;font-weight:600;white-space:nowrap;vertical-align:top">${label}</th><td style="padding:6px 0">${escapeHtml(value)}</td></tr>`;

  const html = `<!doctype html>
<html lang="ko">
<body style="margin:0;padding:24px;background:#f7f8fa;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#141821;font-size:15px;line-height:1.7">
<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e1e5ec;border-radius:12px;padding:24px">
<p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#1f3fae">포트폴리오 문의</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:15px">
${row("이름", input.name)}
${row("소속", organization)}
${row("메일 주소", input.email)}
${row("제목", input.subject)}
</table>
<hr style="border:0;border-top:1px solid #e1e5ec;margin:16px 0">
<div style="white-space:pre-wrap;word-break:break-word">${escapeHtml(input.body)}</div>
<hr style="border:0;border-top:1px solid #e1e5ec;margin:16px 0">
<p style="margin:0;font-size:13px;color:#566070">이 메일에 답장하면 문의하신 분의 메일 주소로 바로 회신됩니다.</p>
</div>
</body>
</html>`;

  return { subject, text, html };
}

export class MailNotConfiguredError extends Error {
  constructor() {
    super("SMTP 환경 변수(CONTACT_TO, SMTP_HOST, SMTP_USER, SMTP_PASS)가 설정되지 않았습니다.");
    this.name = "MailNotConfiguredError";
  }
}

/**
 * 보낸 사람(From) 주소를 정한다.
 * - SMTP_FROM 이 있으면 그 주소 (발송 서비스처럼 로그인 아이디가 메일 주소가 아닌 경우. 예: contact@fillddak.kr)
 * - 없으면 SMTP_USER (네이버 SMTP 처럼 로그인 계정이 곧 보내는 주소인 경우)
 */
export function resolveFromAddress(env: { SMTP_FROM?: string; SMTP_USER?: string }): string | null {
  const address = env.SMTP_FROM ?? env.SMTP_USER;
  return address && address.includes("@") ? address : null;
}

/**
 * 메일의 보낸 사람, 받는 사람, 회신 주소를 만든다.
 * 발신자(From)는 내 발송 주소이고, 방문자 주소는 replyTo 에만 넣는다.
 * 방문자 주소를 From 으로 쓰면 SPF/DMARC 검사에 걸려 스팸 처리되거나 발송이 거부된다.
 */
export function buildContactEnvelope(
  input: ContactMailInput,
  addresses: { from: string; to: string },
) {
  return {
    from: { name: "포트폴리오 문의", address: addresses.from },
    to: addresses.to,
    replyTo: { name: input.name, address: input.email },
  };
}

type MailContent = { subject: string; text: string; html: string };

/**
 * 설정된 SMTP 로 CONTACT_TO 에게 메일 한 통을 보낸다. 문의 메일과 상태 감시 알림이 함께 쓴다.
 * makeEnvelope 는 보내는 주소와 받는 주소를 받아 From/To/Reply-To 를 정한다.
 */
async function sendToOwner(
  content: MailContent,
  makeEnvelope: (addresses: { from: string; to: string }) => object,
): Promise<void> {
  const env = getEnv();
  const from = resolveFromAddress(env);
  if (!env.CONTACT_TO || !env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !from) {
    throw new MailNotConfiguredError();
  }

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    // 465 는 처음부터 TLS, 587 은 STARTTLS 로 올린다.
    secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT === 587,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  try {
    await transport.sendMail({ ...makeEnvelope({ from, to: env.CONTACT_TO }), ...content });
  } finally {
    transport.close();
  }
}

/** 문의 메일을 보낸다. */
export async function sendContactMail(input: ContactMailInput): Promise<void> {
  await sendToOwner(buildContactMail(input), (addresses) => buildContactEnvelope(input, addresses));
}

/** 사이트 운영자(CONTACT_TO)에게 알림 메일을 보낸다. 예: 상태 감시 장애·복구 알림 */
export async function sendOwnerNotice(content: MailContent): Promise<void> {
  await sendToOwner(content, ({ from, to }) => ({
    from: { name: "포트폴리오 알림", address: from },
    to,
  }));
}

export type MailErrorInfo = {
  /** nodemailer 오류 코드. 예: EAUTH, ECONNECTION, ETIMEDOUT */
  code: string;
  /** SMTP 응답 코드. 예: 535 */
  responseCode: number | null;
  /** 실패한 SMTP 단계. 예: AUTH PLAIN, CONN */
  command: string;
  message: string;
  /** 사람이 바로 확인해 볼 수 있는 원인과 조치 */
  hint: string;
};

/** 발송 오류를 로그에 남기기 좋은 형태로 정리한다. 비밀번호 같은 설정값은 포함하지 않는다. */
export function describeMailError(error: unknown): MailErrorInfo {
  if (error instanceof MailNotConfiguredError) {
    const env = getEnv();
    const missing: string[] = (["CONTACT_TO", "SMTP_HOST", "SMTP_USER", "SMTP_PASS"] as const).filter(
      (key) => !env[key],
    );
    // 발송 서비스는 로그인 아이디가 메일 주소가 아니라서 보내는 주소를 따로 적어야 한다.
    if (!resolveFromAddress(env)) missing.push("SMTP_FROM(보내는 메일 주소)");
    return {
      code: "NOT_CONFIGURED",
      responseCode: null,
      command: "",
      message: error.message,
      hint: `.env 에 다음 값이 비어 있습니다: ${missing.join(", ")}. 채운 뒤 서버를 재시작하세요.`,
    };
  }

  const source = (error ?? {}) as {
    code?: unknown;
    responseCode?: unknown;
    command?: unknown;
    message?: unknown;
  };
  const code = typeof source.code === "string" ? source.code : "UNKNOWN";
  const responseCode = typeof source.responseCode === "number" ? source.responseCode : null;
  const command = typeof source.command === "string" ? source.command : "";
  const message = typeof source.message === "string" ? source.message : String(error);

  return { code, responseCode, command, message, hint: mailErrorHint(code, responseCode) };
}

function mailErrorHint(code: string, responseCode: number | null): string {
  if (code === "EAUTH" || responseCode === 535) {
    return (
      "SMTP 로그인이 거부되었습니다. SMTP_USER/SMTP_PASS 를 확인하세요. " +
      "발송 서비스(Resend 등)는 SMTP_USER 가 서비스에서 정한 고정 아이디이고 SMTP_PASS 가 API 키입니다. " +
      "네이버 SMTP 는 'IMAP/SMTP 사용함' 설정과 2단계 인증 후 발급한 애플리케이션 비밀번호가 필요합니다."
    );
  }
  if (code === "ECONNECTION" || code === "ESOCKET" || code === "ECONNREFUSED") {
    return "SMTP 서버에 연결하지 못했습니다. SMTP_HOST 와 SMTP_PORT(465 또는 587), 서버의 아웃바운드 방화벽을 확인하세요.";
  }
  if (code === "ETIMEDOUT" || code === "ETIME") {
    return "SMTP 서버 응답이 시간 안에 오지 않았습니다. 네트워크 상태나 방화벽(465/587 포트 차단 여부)을 확인하세요.";
  }
  if (code === "EDNS" || code === "ENOTFOUND") {
    return "SMTP 서버 주소를 찾지 못했습니다. SMTP_HOST 값과 DNS 를 확인하세요.";
  }
  if (code === "EENVELOPE" || responseCode === 550 || responseCode === 553 || responseCode === 554) {
    return "받는 주소나 보내는 주소를 SMTP 서버가 거부했습니다. CONTACT_TO 와 보내는 주소(SMTP_FROM)를 확인하세요. 발송 서비스에서는 보내는 주소의 도메인이 인증된 상태여야 합니다.";
  }
  if (code === "EMESSAGE" || responseCode === 552) {
    return "메일 내용이 거부되었습니다(용량 초과 또는 스팸 판정). 응답 메시지를 확인하세요.";
  }
  if (responseCode !== null && responseCode >= 400 && responseCode < 500) {
    return "SMTP 서버가 일시적으로 거부했습니다(발송 한도 초과일 수 있음). 잠시 후 다시 시도하세요.";
  }
  return "원인을 자동으로 분류하지 못했습니다. message 의 SMTP 응답을 확인하세요.";
}
