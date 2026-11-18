#!/usr/bin/env bash
# 서버 최초 세팅 (Ubuntu 24.04, Oracle Cloud E2 Micro). 다시 실행해도 안전하다(이미 있는 것은 건너뛴다).
#
# 사용: deploy 폴더를 서버에 올린 뒤
#   sudo bash deploy/server-setup.sh
#
# 하는 일
# - Node.js 24, Nginx, certbot, sqlite3 설치
# - 사용자: portfolio(앱 실행 전용, 로그인 불가), deploy(GitHub Actions 배포 전용)
# - 폴더: /opt/portfolio(버전별 앱), /var/lib/portfolio(DB·업로드), /var/backups/portfolio(백업), /etc/portfolio(환경 변수)
# - 환경 변수 파일 생성(SESSION_SECRET, ANALYTICS_SECRET 자동 생성)
# - systemd 서비스, 매일 백업 타이머, 배포·백업 스크립트, Nginx 설정 설치
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "sudo 로 실행하세요: sudo bash $0"; exit 1; }
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_MAJOR=24
DOMAIN=fillddak.kr

step() { echo; echo "==> $*"; }

step "패키지 설치"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg nginx certbot sqlite3

if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_MAJOR}.* ]]; then
  step "Node.js ${NODE_MAJOR} 설치 (NodeSource 저장소)"
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
fi
echo "node $(node -v), npm $(npm -v)"

step "사용자"
id portfolio >/dev/null 2>&1 \
  || useradd --system --home-dir /var/lib/portfolio --no-create-home --shell /usr/sbin/nologin portfolio
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
passwd -l deploy >/dev/null
# Nginx 가 업로드 이미지를 직접 읽을 수 있게 portfolio 그룹에 넣는다(DB 폴더는 portfolio 만 접근).
usermod -aG portfolio www-data

step "폴더"
install -d -o root -g root -m 0755 /opt/portfolio /opt/portfolio/releases /opt/portfolio/tools
install -d -o portfolio -g portfolio -m 0750 /var/lib/portfolio /var/lib/portfolio/uploads \
  /var/lib/portfolio/uploads/images /var/lib/portfolio/uploads/resume
install -d -o portfolio -g portfolio -m 0700 /var/lib/portfolio/db
install -d -o root -g root -m 0700 /var/backups/portfolio
install -d -o root -g portfolio -m 0750 /etc/portfolio
install -d -o root -g root -m 0755 /var/www/certbot

step "환경 변수 파일"
ENV_FILE=/etc/portfolio/portfolio.env
if [[ -f $ENV_FILE ]]; then
  echo "이미 있습니다: $ENV_FILE (그대로 둡니다)"
else
  install -o root -g portfolio -m 0640 "$HERE/portfolio.env.example" "$ENV_FILE"
  secret() { openssl rand -base64 48 | tr '+/' '-_' | tr -d '=\n'; }
  sed -i -e "s|^SESSION_SECRET=\"\"|SESSION_SECRET=\"$(secret)\"|" \
    -e "s|^ANALYTICS_SECRET=\"\"|ANALYTICS_SECRET=\"$(secret)\"|" "$ENV_FILE"
  echo "만들었습니다: $ENV_FILE  →  CONTACT_TO, SMTP_PASS, ADMIN_USERNAME, ADMIN_PASSWORD_HASH_B64 를 채우세요."
fi

step "배포·백업 스크립트"
install -o root -g root -m 0755 "$HERE/portfolio-deploy.sh" /usr/local/sbin/portfolio-deploy
install -o root -g root -m 0755 "$HERE/portfolio-backup.sh" /usr/local/sbin/portfolio-backup
# deploy 사용자는 비밀번호 없이 배포 스크립트만(인자 없이) 실행할 수 있다.
SUDOERS=/etc/sudoers.d/portfolio-deploy
echo 'deploy ALL=(root) NOPASSWD: /usr/local/sbin/portfolio-deploy ""' > "$SUDOERS.tmp"
chmod 0440 "$SUDOERS.tmp"
visudo -cf "$SUDOERS.tmp" >/dev/null
mv "$SUDOERS.tmp" "$SUDOERS"

step "systemd"
install -m 0644 "$HERE/portfolio.service" /etc/systemd/system/portfolio.service
install -m 0644 "$HERE/portfolio-backup.service" /etc/systemd/system/portfolio-backup.service
install -m 0644 "$HERE/portfolio-backup.timer" /etc/systemd/system/portfolio-backup.timer
systemctl daemon-reload
# 앱은 첫 배포 때 시작된다. 지금은 부팅 시 자동 시작만 켠다.
systemctl enable portfolio >/dev/null
systemctl enable --now portfolio-backup.timer >/dev/null

step "Nginx"
rm -f /etc/nginx/sites-enabled/default
if [[ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]]; then
  install -m 0644 "$HERE/nginx/portfolio.conf" /etc/nginx/sites-available/portfolio
  echo "인증서가 있어 HTTPS 설정을 설치했습니다."
else
  install -m 0644 "$HERE/nginx/portfolio-bootstrap.conf" /etc/nginx/sites-available/portfolio
  echo "인증서가 아직 없어 임시 설정(HTTP)을 설치했습니다. DNS 연결 후 issue-cert.sh 를 실행하세요."
fi
ln -sfn /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/portfolio
nginx -t
systemctl enable nginx >/dev/null
systemctl reload nginx || systemctl restart nginx

# 인증서가 갱신되면 Nginx 가 새 인증서를 읽게 한다(갱신은 certbot 패키지의 타이머가 한다).
install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx

step "완료"
cat <<EOF
다음 순서:
  1. sudo nano $ENV_FILE        (비어 있는 값 채우기)
  2. DNS 가 이 서버를 가리키면: sudo bash $HERE/issue-cert.sh
  3. 배포 키 등록:             sudo bash $HERE/authorize-deploy-key.sh <공개키 파일>
EOF
