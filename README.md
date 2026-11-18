# fillddak.kr — 백엔드 개발자 포트폴리오

[![CI · Deploy](https://github.com/FillDDak/portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/FillDDak/portfolio/actions/workflows/ci.yml)

**🔗 [사이트 바로가기](https://fillddak.kr)**

백엔드 개발자 포트폴리오 사이트와 관리자 화면입니다. 관리자 화면에서 프로젝트·스킬·자격증·PDF 를 고치면 공개 페이지에 바로 반영되고, 문의 메일, 방문 통계, 서비스 상태 페이지를 함께 제공합니다. 1GB 메모리 서버 한 대에서 운영하는 것을 전제로 만들었습니다.

## 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [폴더 구조](#폴더-구조)
- [로컬 실행](#로컬-실행)
- [환경 변수](#환경-변수)
- [메일 발송 설정](#메일-발송-설정)
- [운영 서버 구성](#운영-서버-구성)
- [서버 최초 세팅](#서버-최초-세팅)
- [배포](#배포)
- [백업과 복구](#백업과-복구)

---

## 주요 기능

| 영역 | 내용 |
|---|---|
| **공개 페이지** | 소개·프로젝트·스킬·자격증·문의를 한 페이지에, 프로젝트 상세(문제 → 해결 → 결과), PDF 포트폴리오, [서비스 상태](https://fillddak.kr/status) |
| **문의 메일** | 로그인 없이 폼으로 발송. 검증 → 허니팟 → IP별 요청 제한 → 중복 방지 → DB 저장 → SMTP 발송. 발송에 실패해도 저장하고 원인을 기록 |
| **관리자** | 콘텐츠 추가·수정·삭제·순서 변경, 이미지 업로드(webp 변환), 받은 문의, 상태 감시 URL. 로그인 시도 제한, 암호화 세션 쿠키 |
| **방문 통계** | 실시간 접속자, 일별 추이 차트, 프로젝트별 조회수, 유입 경로. IP 원문은 저장하지 않고 날마다 바뀌는 해시로 중복만 구분. 봇·관리자 제외 |
| **품질** | Lighthouse 모바일 성능·접근성·SEO 각 90 이상, 360px 부터 대응, 주간/야간 화면, 보안 헤더(CSP·HSTS 등) |
| **운영** | push 하면 검사 → 배포 자동 진행, 헬스체크 실패 시 이전 버전으로 복구, 매일 백업 |

## 기술 스택

| 구분 | 사용 |
|---|---|
| 프레임워크 | [Next.js 16](https://nextjs.org/docs) (App Router, Cache Components, standalone 출력), [React 19](https://react.dev), TypeScript |
| 스타일 | [Tailwind CSS 4](https://tailwindcss.com/docs), Pretendard · IBM Plex Mono (셀프 호스팅) |
| DB | SQLite + [Prisma 7](https://www.prisma.io/docs) (better-sqlite3 드라이버 어댑터) |
| 검증·인증 | [Zod 4](https://zod.dev), bcryptjs, [jose](https://github.com/panva/jose) (JWE 세션) |
| 메일·이미지 | [Nodemailer](https://nodemailer.com) + [Resend](https://resend.com/docs) SMTP, [sharp](https://sharp.pixelplumbing.com) |
| 테스트 | [Vitest](https://vitest.dev) (단위), [Playwright](https://playwright.dev) (E2E, PC·모바일) |
| 인프라 | Oracle Cloud E2 Micro (Ubuntu 24.04, RAM 1GB), [Nginx](https://nginx.org/en/docs/), [Let's Encrypt](https://letsencrypt.org), systemd |
| CI/CD | [GitHub Actions](https://docs.github.com/actions) |

Docker·Redis 같은 별도 프로세스는 메모리 제약 때문에 쓰지 않고, 캐시·요청 제한·실시간 집계는 프로세스 메모리와 SQLite 로 처리합니다.

## 폴더 구조

| 경로 | 내용 |
|---|---|
| [`src/app/`](src/app) | 페이지와 API. `(public)` 공개 페이지, `(admin)` 관리자, `api/` |
| [`src/components/`](src/components) | 화면 구성 요소 |
| [`src/lib/`](src/lib) | 인증, 통계, 메일, 업로드, 검증, 환경 변수 등 서버 로직 |
| [`src/proxy.ts`](src/proxy.ts) | 관리자 접근 확인, 없는 프로젝트 404 처리 (Next 16 의 미들웨어) |
| [`prisma/`](prisma) | DB 스키마, 마이그레이션, 개발용 더미 데이터 |
| [`tests/`](tests) | 단위 테스트(`unit/`), E2E 테스트(`e2e/`) |
| [`scripts/`](scripts) | 테스트 서버, 가짜 SMTP, 비밀번호 해시, 스크린샷, Lighthouse |
| [`deploy/`](deploy) | 서버 세팅·Nginx·systemd·배포·백업 스크립트 |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | CI/CD 워크플로 |

---

## 로컬 실행

[Node.js 24](https://nodejs.org) 이상이 필요합니다.

```bash
npm install                 # prisma 클라이언트도 함께 생성된다
cp .env.example .env        # 값 채우기 (아래 "환경 변수")
npm run db:migrate          # data/dev.db 생성
npm run seed:dev            # (선택) 화면 확인용 더미 데이터. 지우기: npm run seed:dev:clear
npm run dev                 # http://localhost:3000 , 관리자: http://localhost:3000/admin
```

| 명령 | 내용 |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | 라우트 타입 생성(`next typegen`) 후 TypeScript 검사 |
| `npm test` | 단위 테스트 (Vitest) |
| `npm run build` → `npm run test:e2e` | E2E 테스트 (Playwright). 운영 빌드를 테스트 설정으로 띄워 PC·모바일 화면에서 확인 |
| `node scripts/start-test-server.mjs 3100 --seed` | 운영 빌드를 테스트 DB 로 실행 (관리자 `admin` / `test-password-1234`) |
| `npm run dev:smtp` | 가짜 SMTP 서버. 받은 메일을 파일로 저장 |
| `npm run hash-password` | 관리자 비밀번호 해시 만들기 |
| `npm run lighthouse` | Lighthouse 모바일 측정 |

> Windows 의 Git Bash 는 `/` 로 시작하는 인자를 Windows 경로로 바꾸므로, 경로 인자를 넘기는 스크립트는 PowerShell 에서 실행합니다.

## 환경 변수

| 위치 | 파일 |
|---|---|
| 로컬 | `.env` (예시: [`.env.example`](.env.example)) |
| 운영 서버 | `/etc/portfolio/portfolio.env` (예시: [`deploy/portfolio.env.example`](deploy/portfolio.env.example)) |

두 파일은 서로 연결되어 있지 않습니다. `.env` 는 GitHub 에 올라가지 않으므로 **push 해도 서버에 반영되지 않습니다.** 운영 값은 서버에서 직접 고치고 `sudo systemctl restart portfolio` 로 다시 시작합니다.

| 이름 | 설명 |
|---|---|
| `DATABASE_URL` | SQLite 파일. 운영: `file:/var/lib/portfolio/db/portfolio.db` |
| `UPLOAD_DIR` | 업로드 이미지·PDF 폴더. 운영: `/var/lib/portfolio/uploads` |
| `SITE_URL` | 사이트 주소 (끝 슬래시 없이). 운영: `https://fillddak.kr` |
| `CONTACT_TO` | 문의를 받을 메일 주소. 화면에는 나오지 않는다 |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` | 메일 발송 ([메일 발송 설정](#메일-발송-설정)) |
| `ADMIN_USERNAME` `ADMIN_PASSWORD_HASH_B64` | 관리자 아이디와 비밀번호 해시 |
| `SESSION_SECRET` `ANALYTICS_SECRET` | 각각 32자 이상 임의 문자열 |
| `TRUSTED_PROXY_HOPS` | 앱 앞 프록시 수. 운영(Nginx) `1`, 로컬 `0` |
| `PAGEVIEW_RETENTION_DAYS` | 조회 상세 기록 보관 일수 (기본 180). 지나면 일별 집계만 남는다 |
| `TURNSTILE_SITE_KEY` `TURNSTILE_SECRET_KEY` | (선택) 둘 다 있으면 문의 폼에 [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) 이 켜진다 |

```bash
# 임의 비밀값 만들기
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 관리자 비밀번호 해시 (비밀번호를 두 번 입력, 10자 이상)
npm run hash-password
```

- bcrypt 해시의 `$` 가 환경 변수 파일에서 깨지지 않도록 base64 로 감싼 값(`ADMIN_PASSWORD_HASH_B64`)을 씁니다.
- 로그인은 IP 당 15분에 5회 실패하면 잠깁니다.
- 화면에 보이는 **공개 이메일**은 환경 변수가 아니라 관리자 화면의 **자기소개·링크 → 공개 이메일**에서 정합니다.

## 메일 발송 설정

25번 포트로 직접 보내지 않고 SMTP(465 SSL 또는 587 STARTTLS)로 보냅니다. 발송에 실패해도 문의는 DB 에 저장되고, 관리자 화면의 받은 문의에 실패 원인이 표시됩니다.

<details open>
<summary><b>A. Resend + 내 도메인 (현재 사용)</b></summary>

1. [Resend](https://resend.com/domains) 에서 도메인을 추가하고, 안내하는 DNS 레코드(DKIM TXT, 발송용 하위 도메인의 SPF MX·TXT)를 DNS 관리 화면에 그대로 등록합니다. 상태가 Verified 가 될 때까지 기다립니다.
2. [API 키](https://resend.com/api-keys)를 만듭니다 (Sending access).
3. 환경 변수:
   ```
   SMTP_HOST="smtp.resend.com"
   SMTP_PORT="465"
   SMTP_USER="resend"
   SMTP_PASS="re_..."              # API 키
   SMTP_FROM="contact@fillddak.kr" # 인증한 도메인의 주소
   ```
</details>

<details>
<summary><b>B. 네이버 메일 SMTP</b></summary>

1. 네이버 메일 환경설정에서 POP3/SMTP 사용을 켭니다. 2단계 인증을 켜고 애플리케이션 비밀번호를 발급합니다.
2. 환경 변수:
   ```
   SMTP_HOST="smtp.naver.com"
   SMTP_PORT="465"
   SMTP_USER="아이디@naver.com"
   SMTP_PASS="애플리케이션 비밀번호"
   SMTP_FROM=""                    # 비우면 SMTP_USER 로 보낸다
   ```
</details>

---

## 운영 서버 구성

```
방문자 ──HTTPS──▶ Nginx (443)
                   ├ /_next/static, /fonts     → /opt/portfolio/current 에서 직접
                   ├ /uploads/<32자>.webp      → /var/lib/portfolio/uploads/images 에서 직접
                   └ 나머지                    → Node.js 앱 127.0.0.1:3000 (systemd: portfolio)

/opt/portfolio/releases/<시각>/   배포한 버전 (최근 3개). current 가 실행 중인 버전을 가리킨다
/var/lib/portfolio/db/            SQLite DB (portfolio 사용자만 접근)
/var/lib/portfolio/uploads/       업로드 이미지·PDF
/var/backups/portfolio/           매일 백업 (14일 보관)
/etc/portfolio/portfolio.env      환경 변수 (비밀값)
```

| 파일 | 내용 |
|---|---|
| [`server-setup.sh`](deploy/server-setup.sh) | 최초 세팅: 패키지, 사용자, 폴더, 서비스, Nginx. 다시 실행해도 안전 |
| [`issue-cert.sh`](deploy/issue-cert.sh) | Let's Encrypt 인증서 발급 후 HTTPS 설정 적용 |
| [`authorize-deploy-key.sh`](deploy/authorize-deploy-key.sh) | GitHub Actions 배포 키 등록 (배포만 가능한 키) |
| [`portfolio.service`](deploy/portfolio.service) | 앱 서비스: 전용 사용자, 메모리 제한 450MB, 실패 시 재시작, 쓰기 가능한 폴더 제한 |
| [`nginx/portfolio.conf`](deploy/nginx/portfolio.conf) | HTTPS, www → 본 주소 301, HTTP/2, gzip, 정적 파일 장기 캐시, 업로드 25MB, 스트리밍(버퍼링 끔), HSTS |
| [`portfolio-deploy.sh`](deploy/portfolio-deploy.sh) | 배포: 백업 → 마이그레이션 → 교체 → 재시작 → 헬스체크 → 실패 시 이전 버전 복구 |
| [`portfolio-backup.sh`](deploy/portfolio-backup.sh) + [`.timer`](deploy/portfolio-backup.timer) | 매일 04:30 DB 온라인 백업과 업로드 파일 압축 |
| [`package-release.sh`](deploy/package-release.sh) | (GitHub Actions) 빌드 결과를 배포 묶음으로 만든다 |

## 서버 최초 세팅

Oracle Cloud 인스턴스(Ubuntu 24.04)를 만들고, [보안 목록](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm)과 서버 iptables 에서 80·443 포트를 연 상태에서 시작합니다.

1. **DNS** — `fillddak.kr`, `www.fillddak.kr` 의 A 레코드를 서버 공인 IP 로 등록합니다 (메일용 레코드는 그대로 둡니다).

2. **설정 파일 올리기와 세팅** — 내 PC 에서:
   ```bash
   scp -i <SSH 키> -r deploy ubuntu@<서버 IP>:~/
   ssh -i <SSH 키> ubuntu@<서버 IP>
   sudo bash ~/deploy/server-setup.sh
   ```

3. **환경 변수** — `SESSION_SECRET`, `ANALYTICS_SECRET` 은 세팅 스크립트가 만들어 둡니다.
   ```bash
   sudo nano /etc/portfolio/portfolio.env   # CONTACT_TO, SMTP_PASS, ADMIN_USERNAME, ADMIN_PASSWORD_HASH_B64
   ```

4. **HTTPS 인증서** — DNS 가 서버를 가리키는지 확인(`nslookup fillddak.kr`)한 뒤:
   ```bash
   sudo bash ~/deploy/issue-cert.sh
   ```

5. **배포 키** — 서버에서 배포 전용 키를 만들고 공개키를 등록합니다.
   ```bash
   ssh-keygen -t ed25519 -N "" -C github-actions-deploy -f ~/gh-deploy
   sudo bash ~/deploy/authorize-deploy-key.sh ~/gh-deploy.pub
   wc -l ~/gh-deploy                                                   # 7줄이어야 한다
   cat ~/gh-deploy                                                     # 개인키 → DEPLOY_SSH_KEY
   echo "<서버 IP> $(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)" # → DEPLOY_KNOWN_HOSTS
   rm ~/gh-deploy ~/gh-deploy.pub                                      # GitHub 에 넣은 뒤 지운다
   ```
   개인키는 `-----BEGIN` 부터 `-----END ... KEY-----` 까지 7줄을 빠짐없이 복사합니다. 줄이 빠지면 배포가 `Load key ... error in libcrypto` 로 실패합니다.

6. **GitHub 설정** — 저장소 → [Settings → Secrets and variables → Actions](https://github.com/FillDDak/portfolio/settings/secrets/actions)
   | 종류 | 이름 | 값 |
   |---|---|---|
   | Secret | `DEPLOY_HOST` | 서버 공인 IP |
   | Secret | `DEPLOY_SSH_KEY` | 배포 전용 개인키 |
   | Secret | `DEPLOY_KNOWN_HOSTS` | `<서버 IP> ssh-ed25519 AAAA...` 한 줄 |
   | Variable | `DEPLOY_ENABLED` | `true` (없으면 검사만 하고 배포하지 않는다) |

7. **첫 배포** — main 에 push 하거나 [Actions](https://github.com/FillDDak/portfolio/actions/workflows/ci.yml) 에서 **Run workflow** 를 누릅니다. 첫 배포 때 DB 가 만들어지고(기본 프로필, 스킬 분류, 감시 URL) prisma CLI 를 한 번 설치해서 몇 분 더 걸립니다.

8. **내용 입력** — 관리자 화면(`/admin`)에 로그인해 자기소개·공개 이메일·프로젝트·PDF 등을 입력합니다.

## 배포

`main` 에 push 하면 [GitHub Actions](https://github.com/FillDDak/portfolio/actions/workflows/ci.yml) 가 실행됩니다.

```
push ─▶ 검사 (lint · 타입 · 단위 테스트 · 빌드 · E2E) ─▶ 배포 묶음 ─▶ SSH 로 서버에 전송
     ─▶ 배포 직전 DB 백업 ─▶ prisma migrate deploy ─▶ current 교체 ─▶ 재시작 ─▶ 헬스체크 (최대 120초)
                                                                              └ 실패 시 이전 버전으로 복구
```

- 검사가 하나라도 실패하면 배포하지 않습니다.
- 서버와 같은 linux-x64 에서 빌드하므로 sharp·better-sqlite3 네이티브 파일이 서버용으로 들어갑니다.
- 배포 키는 서버에서 배포 스크립트만 실행할 수 있습니다 (셸 접속, 포트 포워딩 불가).

### push 로 반영되는 것과 아닌 것

| 바꾼 것 | push 로 자동 반영 | 적용 방법 |
|---|---|---|
| 앱 코드 (`src/`, `public/`, DB 마이그레이션) | ✅ | push 만 하면 된다 |
| 서버 설정 (`deploy/`: Nginx, systemd, 스크립트) | ❌ | 아래 명령으로 직접 적용 |
| 환경 변수 | ❌ | 서버의 `/etc/portfolio/portfolio.env` 수정 후 재시작 |
| 관리자 화면에서 입력한 내용 | — | 저장하면 바로 반영 (배포해도 유지) |

```bash
scp -i <SSH 키> -r deploy ubuntu@<서버 IP>:~/                       # 내 PC
sudo install -m 0644 ~/deploy/nginx/portfolio.conf /etc/nginx/sites-available/portfolio \
  && sudo nginx -t && sudo systemctl reload nginx                   # Nginx 설정
sudo bash ~/deploy/server-setup.sh                                  # 그 밖의 설정 (다시 실행해도 안전)
```

### 수동으로 이전 버전으로 돌리기

```bash
ls /opt/portfolio/releases
sudo ln -sfn /opt/portfolio/releases/<버전> /opt/portfolio/current && sudo systemctl restart portfolio
```

DB 마이그레이션은 되돌려지지 않습니다. 스키마가 바뀐 배포를 되돌릴 때는 [복구](#복구) 방법으로 배포 직전 백업(`*-pre-deploy`)도 함께 되돌립니다.

### 상태 확인

```bash
systemctl status portfolio
journalctl -u portfolio -n 100 --no-pager      # 앱 로그
sudo nginx -t && sudo systemctl reload nginx   # Nginx 설정 검사·적용
```

## 백업과 복구

매일 04:30 (서버 시간 Asia/Seoul) 과 배포 직전에 `/var/backups/portfolio` 에 남기고, 14일이 지난 것은 지웁니다.

| 파일 | 내용 |
|---|---|
| `db-<시각>-<daily\|pre-deploy>.sqlite3.gz` | 앱을 멈추지 않고 SQLite `.backup` 으로 복사, 무결성 검사 후 압축 |
| `uploads-<시각>-<...>.tar.gz` | 업로드 이미지와 PDF |

```bash
sudo portfolio-backup manual                  # 지금 바로 백업
systemctl list-timers portfolio-backup        # 다음 실행 시각
sudo du -sh /var/backups/portfolio            # 백업 용량
```

백업은 같은 서버 디스크에 있으므로, 서버를 잃는 경우에 대비해 가끔 내 PC 로 내려받아 둡니다. Windows 에서는 **cmd** 에서 실행합니다 (PowerShell 5.1 의 `>` 는 압축 파일을 깨뜨립니다).

```bash
ssh -i <SSH 키> ubuntu@<서버 IP> "sudo tar -C /var/backups -cz portfolio" > portfolio-backups.tar.gz
```

### 복구

```bash
sudo systemctl stop portfolio

# DB
gunzip -c /var/backups/portfolio/db-<시각>-daily.sqlite3.gz | sudo tee /var/lib/portfolio/db/portfolio.db > /dev/null
sudo rm -f /var/lib/portfolio/db/portfolio.db-journal
sudo chown portfolio:portfolio /var/lib/portfolio/db/portfolio.db && sudo chmod 600 /var/lib/portfolio/db/portfolio.db

# 업로드 파일
sudo rm -rf /var/lib/portfolio/uploads
sudo tar -xzf /var/backups/portfolio/uploads-<시각>-daily.tar.gz -C /var/lib/portfolio
sudo chown -R portfolio:portfolio /var/lib/portfolio/uploads

sudo systemctl start portfolio
```

앱은 시작할 때 공개 페이지 캐시를 비우므로 복구한 내용이 바로 보입니다.
