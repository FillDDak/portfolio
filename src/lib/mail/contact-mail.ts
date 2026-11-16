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
 * 문의 메일을 보낸다.
 * 발신자(From)는 내 SMTP 계정이고, 방문자 주소는 replyTo 에만 넣는다.
 * 방문자 주소를 From 으로 쓰면 SPF/DMARC 검사에 걸려 스팸 처리되거나 발송이 거부된다.
 */
export async function sendContactMail(input: ContactMailInput): Promise<void> {
  const env = getEnv();
  if (!env.CONTACT_TO || !env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
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

  const { subject, text, html } = buildContactMail(input);

  try {
    await transport.sendMail({
      from: { name: "포트폴리오 문의", address: env.SMTP_USER },
      to: env.CONTACT_TO,
      replyTo: { name: input.name, address: input.email },
      subject,
      text,
      html,
    });
  } finally {
    transport.close();
  }
}
