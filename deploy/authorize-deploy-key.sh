#!/usr/bin/env bash
# GitHub Actions 배포용 공개키를 deploy 사용자에 등록한다.
# 이 키로 접속하면 배포 스크립트만 실행되고, 셸·포트 포워딩 등은 막힌다.
#
# 사용: sudo bash deploy/authorize-deploy-key.sh <공개키 파일(.pub)>
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "sudo 로 실행하세요."; exit 1; }
[[ $# -eq 1 && -f $1 ]] || { echo "사용: sudo bash $0 <공개키 파일(.pub)>"; exit 1; }

key=$(head -n 1 "$1")
[[ $key =~ ^ssh-(ed25519|rsa)\ [A-Za-z0-9+/=]+ ]] || { echo "공개키 형식이 아닙니다(.pub 파일을 지정하세요)."; exit 1; }

install -d -o deploy -g deploy -m 0700 /home/deploy/.ssh
echo "command=\"sudo /usr/local/sbin/portfolio-deploy\",restrict $key" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 0600 /home/deploy/.ssh/authorized_keys
echo "등록했습니다. 이 키로는 배포만 할 수 있습니다."
