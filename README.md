# 포트폴리오 (fillddak.kr)

백엔드 개발자 포트폴리오 사이트와 관리자 화면. 프로젝트·스킬·자격증·PDF를 관리자 화면에서 고치면 공개 페이지에 바로 반영되고, 문의 메일, 방문 통계, 서비스 상태 페이지를 함께 제공한다.

- Next.js 16 (App Router, standalone 출력), React 19, TypeScript, Tailwind CSS 4
- SQLite + Prisma 7 (better-sqlite3 어댑터), Zod, Nodemailer, sharp
- 운영: Oracle Cloud E2 Micro(Ubuntu 24.04, RAM 1GB) + Nginx + Let's Encrypt + systemd, GitHub Actions 배포

## 로컬 실행

Node.js 24 이상이 필요하다.

```bash
npm install                 # prisma 클라이언트도 함께 생성된다
cp .env.example .env        # 값 채우기(아래 "환경 변수")
npm run db:migrate          # data/dev.db 생성
npm run seed:dev            # (선택) 화면 확인용 더미 데이터. 지우기: npm run seed:dev:clear
npm run dev                 # http://localhost:3000, 관리자: /admin
```

| 명령 | 내용 |
|---|---|
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript 검사 |
| `npm test` | 단위 테스트(Vitest) |
| `npm run build` 후 `npm run test:e2e` | E2E 테스트(Playwright). 운영 빌드를 테스트 설정으로 띄워 PC·모바일 화면에서 확인 |
| `node scripts/start-test-server.mjs 3100 --seed` | 운영 빌드를 테스트 DB로 실행(관리자 admin / test-password-1234) |
| `npm run dev:smtp` | 가짜 SMTP 서버. 받은 메일을 파일로 저장한다 |
| `npm run hash-password` | 관리자 비밀번호 해시 만들기 |

## 환경 변수

로컬은 `.env`, 운영은 서버의 `/etc/portfolio/portfolio.env`에 둔다. 저장소에는 예시 파일(`.env.example`, `deploy/portfolio.env.example`)만 올린다.

| 이름 | 설명 |
|---|---|
| `DATABASE_URL` | SQLite 파일. 운영: `file:/var/lib/portfolio/db/portfolio.db` |
| `UPLOAD_DIR` | 업로드 이미지·PDF 폴더. 운영: `/var/lib/portfolio/uploads` |
| `SITE_URL` | 사이트 주소(끝 슬래시 없이). 운영: `https://fillddak.kr` |
| `CONTACT_TO` | 문의를 받을 메일 주소. 화면에는 나오지 않는다 |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` | 메일 발송(아래 "메일 발송 설정") |
| `ADMIN_USERNAME` `ADMIN_PASSWORD_HASH_B64` | 관리자 아이디와 비밀번호 해시 |
| `SESSION_SECRET` `ANALYTICS_SECRET` | 각각 32자 이상 임의 문자열. 만들기: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `TRUSTED_PROXY_HOPS` | 앱 앞 프록시 수. 운영(Nginx) 1, 로컬 0 |
| `PAGEVIEW_RETENTION_DAYS` | 조회 상세 기록 보관 일수(기본 180). 지나면 일별 집계만 남는다 |
| `TURNSTILE_SITE_KEY` `TURNSTILE_SECRET_KEY` | (선택) 둘 다 있으면 문의 폼에 Cloudflare Turnstile 이 켜진다 |

화면에 보이는 공개 이메일은 환경 변수가 아니라 관리자 화면의 **자기소개·링크 → 공개 이메일**에서 정한다.

### 관리자 비밀번호

```bash
npm run hash-password       # 비밀번호를 두 번 입력(10자 이상)하면 넣을 줄을 출력한다
```

bcrypt 해시의 `$` 가 환경 변수 파일에서 깨지지 않도록 base64로 감싼 값(`ADMIN_PASSWORD_HASH_B64`)을 쓴다. 로그인은 IP당 15분에 5회 실패하면 잠긴다.

## 메일 발송 설정

25번 포트로 직접 보내지 않고 SMTP(465 SSL 또는 587 STARTTLS)로 보낸다. 발송에 실패해도 문의는 DB에 저장되고, 관리자 화면의 받은 문의에 실패 원인이 표시된다.

**A. Resend + 내 도메인 (현재 사용)**
1. Resend 에서 도메인(fillddak.kr)을 추가하고, 안내하는 DNS 레코드(DKIM TXT, 발송용 하위 도메인의 SPF MX·TXT)를 DNS 관리 화면에 그대로 등록한다. 상태가 Verified 가 될 때까지 기다린다.
2. API 키를 만든다(Sending access).
3. `SMTP_HOST="smtp.resend.com"`, `SMTP_PORT="465"`, `SMTP_USER="resend"`, `SMTP_PASS="re_..."`(API 키), `SMTP_FROM="contact@fillddak.kr"`(인증한 도메인의 주소)

**B. 네이버 메일 SMTP**
1. 네이버 메일 환경설정에서 POP3/SMTP 사용을 켠다. 2단계 인증을 켜고 애플리케이션 비밀번호를 발급한다.
2. `SMTP_HOST="smtp.naver.com"`, `SMTP_PORT="465"`, `SMTP_USER="아이디@naver.com"`, `SMTP_PASS="애플리케이션 비밀번호"`, `SMTP_FROM=""`(비우면 SMTP_USER 로 보낸다)

## 운영 서버 구성

```
Nginx (443, HTTPS) ──▶ Node.js 앱 127.0.0.1:3000 (systemd: portfolio, 사용자 portfolio)
  ├ /_next/static, /fonts   → /opt/portfolio/current 에서 직접
  └ /uploads/<32자>.webp    → /var/lib/portfolio/uploads/images 에서 직접

/opt/portfolio/releases/<시각>/   배포한 버전(최근 3개), current 가 실행 중인 버전을 가리킨다
/var/lib/portfolio/db/            SQLite DB (portfolio 사용자만 접근)
/var/lib/portfolio/uploads/       업로드 이미지·PDF
/var/backups/portfolio/           매일 백업(14일 보관)
/etc/portfolio/portfolio.env      환경 변수(비밀값)
```

설정 파일은 모두 `deploy/` 에 있다.

| 파일 | 내용 |
|---|---|
| `server-setup.sh` | 최초 세팅(패키지, 사용자, 폴더, 서비스, Nginx) |
| `issue-cert.sh` | Let's Encrypt 인증서 발급 후 HTTPS 설정 적용 |
| `authorize-deploy-key.sh` | GitHub Actions 배포 키 등록 |
| `portfolio.service` | 앱 서비스(메모리 제한 450MB, 실패 시 재시작, 쓰기 가능한 폴더 제한) |
| `nginx/portfolio.conf` | HTTPS, www → 본 주소 301, HTTP/2, gzip, 정적 파일 장기 캐시, 업로드 25MB, 스트리밍(버퍼링 끔), HSTS |
| `portfolio-deploy.sh` | 배포: 마이그레이션 → 교체 → 재시작 → 헬스체크 → 실패 시 이전 버전 복구 |
| `portfolio-backup.sh` + `.timer` | 매일 04:30 DB 온라인 백업과 업로드 파일 압축 |
| `package-release.sh` | (GitHub Actions) 빌드 결과를 배포 묶음으로 만든다 |

## 서버 최초 세팅

Oracle Cloud 인스턴스(Ubuntu 24.04)를 만들고, 보안 목록과 서버 iptables 에서 80·443 포트를 연 상태에서 시작한다.

**1. DNS**: `fillddak.kr`, `www.fillddak.kr` 의 A 레코드를 서버 공인 IP로 등록한다(메일용 레코드는 그대로 둔다).

**2. 설정 파일 올리기와 세팅** (내 PC에서)
```bash
scp -i <SSH 키> -r deploy ubuntu@<서버 IP>:~/
ssh -i <SSH 키> ubuntu@<서버 IP>
sudo bash ~/deploy/server-setup.sh
```

**3. 환경 변수 채우기**: `SESSION_SECRET`, `ANALYTICS_SECRET` 은 세팅 스크립트가 만들어 둔다.
```bash
sudo nano /etc/portfolio/portfolio.env   # CONTACT_TO, SMTP_PASS, ADMIN_USERNAME, ADMIN_PASSWORD_HASH_B64
```

**4. HTTPS 인증서**: DNS 가 서버를 가리키는지 확인(`nslookup fillddak.kr`)한 뒤
```bash
sudo bash ~/deploy/issue-cert.sh
```

**5. 배포 키**: 서버에서 배포 전용 키를 만들고 공개키를 등록한다.
```bash
ssh-keygen -t ed25519 -N "" -C github-actions-deploy -f ~/gh-deploy
sudo bash ~/deploy/authorize-deploy-key.sh ~/gh-deploy.pub
cat ~/gh-deploy                              # 개인키 → GitHub Secret DEPLOY_SSH_KEY
echo "<서버 IP> $(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)"   # → DEPLOY_KNOWN_HOSTS
rm ~/gh-deploy ~/gh-deploy.pub               # GitHub 에 넣은 뒤 서버에서 지운다
```

**6. GitHub 설정** (저장소 → Settings → Secrets and variables → Actions)
- Secrets: `DEPLOY_HOST`(서버 IP), `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`
- Variables: `DEPLOY_ENABLED` = `true`

**7. 첫 배포**: main 에 push 하거나 Actions 탭에서 `CI · Deploy` 를 직접 실행한다. 첫 배포 때 DB가 만들어지고(프로필 1행, 기본 스킬 분류, 감시 URL), prisma CLI 를 한 번 설치해서 몇 분 더 걸린다.

**8. 관리자 화면에서 내용 입력**: `https://fillddak.kr/admin` 에 로그인해 자기소개·공개 이메일·프로젝트·PDF 등을 입력한다.

## 배포

`main` 에 push 하면 GitHub Actions(`.github/workflows/ci.yml`)가 실행된다.

1. **검사**: lint → 타입 검사 → 단위 테스트 → 빌드 → E2E. 하나라도 실패하면 배포하지 않는다.
2. **묶기**: standalone 결과물 + `public` + `.next/static` + prisma 마이그레이션. 서버와 같은 linux-x64 에서 빌드해서 sharp·better-sqlite3 네이티브 파일이 서버용으로 들어간다.
3. **배포**: 묶음을 SSH 로 서버에 보내면 `portfolio-deploy` 가 순서대로 처리한다.
   배포 전 DB 백업 → `prisma migrate deploy` → `current` 교체 → 재시작 → 헬스체크(최대 120초) → 실패하면 이전 버전으로 되돌리고 실패로 끝난다.

배포 키는 서버에서 배포 스크립트만 실행할 수 있다(셸 접속, 포트 포워딩 불가).

자동 배포는 앱만 바꾼다. `deploy/` 의 서버 설정(Nginx, systemd, 배포·백업 스크립트)을 고쳤다면 폴더를 다시 올리고 직접 적용한다.
```bash
scp -i <SSH 키> -r deploy ubuntu@<서버 IP>:~/                       # 내 PC
sudo install -m 0644 ~/deploy/nginx/portfolio.conf /etc/nginx/sites-available/portfolio \
  && sudo nginx -t && sudo systemctl reload nginx                   # Nginx 설정
sudo bash ~/deploy/server-setup.sh                                  # 그 밖의 설정(다시 실행해도 안전)
```

**수동으로 이전 버전으로 돌리기**
```bash
ls /opt/portfolio/releases
sudo ln -sfn /opt/portfolio/releases/<버전> /opt/portfolio/current && sudo systemctl restart portfolio
```
DB 마이그레이션은 되돌려지지 않는다. 스키마가 바뀐 배포를 되돌릴 때는 아래 복구 방법으로 배포 직전 백업(`*-pre-deploy`)도 함께 되돌린다.

**상태 확인**
```bash
systemctl status portfolio
journalctl -u portfolio -n 100 --no-pager
sudo nginx -t && sudo systemctl reload nginx
```

## 백업과 복구

매일 04:30(서버 시간 Asia/Seoul)과 배포 직전에 `/var/backups/portfolio` 에 남기고 14일 지난 것은 지운다.
- `db-<시각>-<daily|pre-deploy>.sqlite3.gz`: 앱을 멈추지 않고 SQLite `.backup` 으로 복사, 무결성 검사 후 압축
- `uploads-<시각>-<...>.tar.gz`: 업로드 이미지와 PDF

```bash
sudo portfolio-backup manual                  # 지금 바로 백업
systemctl list-timers portfolio-backup        # 다음 실행 시각
```

백업은 같은 서버 디스크에 있으므로, 서버를 잃는 경우에 대비해 가끔 내 PC로 내려받아 둔다.
```bash
ssh -i <SSH 키> ubuntu@<서버 IP> "sudo tar -C /var/backups -cz portfolio" > portfolio-backups.tar.gz
```

**복구**
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
앱은 시작할 때 공개 페이지 캐시를 비우므로 복구한 내용이 바로 보인다.
