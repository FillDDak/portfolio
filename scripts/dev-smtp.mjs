// 로컬 개발·테스트용 가짜 SMTP 서버. 받은 메일을 실제로 보내지 않고 파일로 저장한다.
// 사용: node scripts/dev-smtp.mjs [포트=2525] [저장 폴더=data/mailbox]
// .env 예: SMTP_HOST=127.0.0.1  SMTP_PORT=2525  SMTP_USER=dev@localhost  SMTP_PASS=dev
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { simpleParser } from "mailparser";
import { SMTPServer } from "smtp-server";

const port = Number(process.argv[2] ?? 2525);
const dir = process.argv[3] ?? "data/mailbox";
mkdirSync(dir, { recursive: true });

let count = 0;

const server = new SMTPServer({
  // 로컬 전용이라 TLS 없이 받고, 아이디와 비밀번호는 무엇이든 통과시킨다.
  disabledCommands: ["STARTTLS"],
  allowInsecureAuth: true,
  onAuth(auth, _session, callback) {
    callback(null, { user: auth.username });
  },
  onData(stream, session, callback) {
    simpleParser(stream)
      .then((mail) => {
        count += 1;
        const saved = {
          envelopeFrom: session.envelope.mailFrom ? session.envelope.mailFrom.address : null,
          envelopeTo: session.envelope.rcptTo.map((rcpt) => rcpt.address),
          from: mail.from?.text ?? null,
          to: mail.to && !Array.isArray(mail.to) ? mail.to.text : null,
          replyTo: mail.replyTo?.text ?? null,
          subject: mail.subject ?? null,
          text: mail.text ?? null,
          html: typeof mail.html === "string" ? mail.html : null,
        };
        const file = join(dir, `${Date.now()}-${count}.json`);
        writeFileSync(file, JSON.stringify(saved, null, 2));
        console.log(`[dev-smtp] 메일 수신: ${saved.subject} → ${file}`);
        callback();
      })
      .catch(callback);
  },
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[dev-smtp] 127.0.0.1:${port} 에서 대기 중. 받은 메일은 ${dir} 에 저장합니다.`);
});
