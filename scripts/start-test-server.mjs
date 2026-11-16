// 테스트용 서버 실행: 운영 빌드(standalone)를 테스트 전용 설정으로 띄운다.
// 사용: npm run build 후 node scripts/start-test-server.mjs [포트=3100]
//
// - 개발용 DB(data/dev.db)를 건드리지 않도록 data/test.db 를 새로 만들어 쓴다.
// - 메일은 가짜 SMTP 서버(127.0.0.1:2525, scripts/dev-smtp.mjs)로 보낸다.
// - 관리자 계정: admin / test-password-1234
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";

const port = process.argv[2] ?? "3100";
const root = process.cwd();
const standalone = resolve(root, ".next/standalone");

if (!existsSync(resolve(standalone, "server.js"))) {
  console.error("운영 빌드가 없습니다. 먼저 npm run build 를 실행하세요.");
  process.exit(1);
}

// standalone 결과물에는 정적 파일이 들어 있지 않아서 직접 복사한다(배포 스크립트도 같은 일을 한다).
cpSync(resolve(root, "public"), resolve(standalone, "public"), { recursive: true });
cpSync(resolve(root, ".next/static"), resolve(standalone, ".next/static"), { recursive: true });
// 빌드할 때 따라 들어온 .env 는 테스트 설정과 섞이지 않게 지운다.
rmSync(resolve(standalone, ".env"), { force: true });

const dataDir = resolve(root, "data/test");
rmSync(dataDir, { recursive: true, force: true });
mkdirSync(resolve(dataDir, "uploads"), { recursive: true });
const databaseUrl = `file:${resolve(dataDir, "test.db").replaceAll("\\", "/")}`;

const TEST_ADMIN = { username: "admin", password: "test-password-1234" };

const env = {
  ...process.env,
  NODE_ENV: "production",
  PORT: port,
  HOSTNAME: "127.0.0.1",
  DATABASE_URL: databaseUrl,
  UPLOAD_DIR: resolve(dataDir, "uploads"),
  SITE_URL: `http://127.0.0.1:${port}`,
  CONTACT_TO: "inbox@example.com",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: "2525",
  SMTP_USER: "test-sender@example.com",
  SMTP_PASS: "test",
  SMTP_FROM: "",
  ADMIN_USERNAME: TEST_ADMIN.username,
  ADMIN_PASSWORD_HASH_B64: Buffer.from(bcrypt.hashSync(TEST_ADMIN.password, 6)).toString("base64"),
  SESSION_SECRET: "test-session-secret-0123456789abcdef0123456789",
  ANALYTICS_SECRET: "test-analytics-secret-0123456789abcdef01234567",
  // 테스트는 X-Forwarded-For 로 방문자 IP 를 바꿔 가며 요청 제한을 확인한다.
  TRUSTED_PROXY_HOPS: "1",
  TURNSTILE_SITE_KEY: "",
  TURNSTILE_SECRET_KEY: "",
};

const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: true,
});
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

const server = spawn(process.execPath, ["server.js"], { cwd: standalone, env, stdio: "inherit" });
const stop = () => server.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => process.exit(code ?? 0));
