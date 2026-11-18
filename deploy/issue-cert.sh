#!/usr/bin/env bash
# Let's Encrypt 인증서를 받고 Nginx 를 HTTPS 설정으로 바꾼다.
# 먼저 DNS 의 A 레코드(fillddak.kr, www.fillddak.kr)가 이 서버의 공인 IP 를 가리켜야 한다.
#
# 사용: sudo bash deploy/issue-cert.sh
# 갱신은 certbot 패키지의 타이머가 자동으로 하고, 갱신 후 Nginx 를 다시 읽는다(server-setup.sh 에서 설정).
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "sudo 로 실행하세요: sudo bash $0"; exit 1; }
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN=fillddak.kr

# Let's Encrypt 는 만료 안내 메일을 더 이상 보내지 않으므로 메일 주소 없이 등록한다.
certbot certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring

install -m 0644 "$HERE/nginx/portfolio.conf" /etc/nginx/sites-available/portfolio
nginx -t
systemctl reload nginx
echo "HTTPS 설정을 적용했습니다: https://$DOMAIN"
