import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : undefined));

/** 빈 문자열은 값이 없는 것으로 보고 기본값을 쓴다. */
const numberWithDefault = (schema: z.ZodNumber, fallback: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce.number().pipe(schema).default(fallback),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** 예: file:/var/lib/portfolio/portfolio.db (배포 폴더 밖) */
  DATABASE_URL: z.string().min(1),
  /** 업로드 파일 저장 경로 (배포 폴더 밖) */
  UPLOAD_DIR: z.string().min(1),
  /** 예: https://fillddak.kr (끝에 슬래시 없이) */
  SITE_URL: z.url().transform((value) => value.replace(/\/+$/, "")),

  /** 문의 메일을 받을 주소. 화면과 클라이언트 코드에 노출하지 않는다. */
  CONTACT_TO: optionalString,
  SMTP_HOST: optionalString,
  SMTP_PORT: numberWithDefault(z.number().int().positive(), 465),
  SMTP_USER: optionalString,
  /** 보낸 사람 주소. 비우면 SMTP_USER 를 쓴다. 발송 서비스에서는 인증한 도메인의 주소를 적는다. */
  SMTP_FROM: optionalString,
  SMTP_PASS: optionalString,

  ADMIN_USERNAME: optionalString,
  /** bcrypt 해시를 base64로 인코딩한 값 (scripts/hash-password.mjs 로 생성) */
  ADMIN_PASSWORD_HASH_B64: optionalString,
  /** 세션 쿠키 암호화 키. 32자 이상 */
  SESSION_SECRET: z.string().min(32),
  /** 방문자 해시용 비밀값. 32자 이상 */
  ANALYTICS_SECRET: z.string().min(32),

  /** 앱 앞에 있는 신뢰할 수 있는 프록시 수. Nginx 하나면 1, 프록시가 없으면 0 */
  TRUSTED_PROXY_HOPS: numberWithDefault(z.number().int().min(0).max(5), 1),
  /** 조회 상세 로그 보관 일수 */
  PAGEVIEW_RETENTION_DAYS: numberWithDefault(z.number().int().min(1), 180),

  /** 둘 다 있을 때만 Turnstile 이 켜진다 */
  TURNSTILE_SITE_KEY: optionalString,
  TURNSTILE_SECRET_KEY: optionalString,

});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * 환경 변수를 검증해서 돌려준다.
 * 빌드 시점이 아니라 실제로 필요한 시점에 호출해서, 값이 빠졌을 때 어떤 변수가 문제인지 알려준다.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`환경 변수 설정이 올바르지 않습니다.\n${detail}`);
  }
  cached = parsed.data;
  return cached;
}

/** 테스트에서 환경 변수를 바꾼 뒤 다시 읽게 할 때 쓴다. */
export function resetEnvCache(): void {
  cached = undefined;
}
