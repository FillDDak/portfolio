#!/usr/bin/env bash
# 표준 입력으로 받은 배포 묶음(tar.gz)을 새 버전으로 설치하고 앱을 재시작한다.
# 새 버전이 응답하지 않으면 이전 버전으로 되돌린다.
#
# 설치 위치: /usr/local/sbin/portfolio-deploy (server-setup.sh 가 복사)
# GitHub Actions 는 deploy 사용자로 접속하고, 그 키로는 이 명령만 실행된다(authorized_keys 의 command=).
#   ssh deploy@서버 < portfolio-release.tar.gz
#
# 순서: 압축 풀기 → 마이그레이션 도구 준비 → DB 백업 → prisma migrate deploy → current 링크 교체
#       → 재시작 → 헬스체크 → (실패 시) 이전 버전으로 복구 → 오래된 버전 정리(최근 3개 유지)
set -euo pipefail
umask 022

APP=/opt/portfolio
RELEASES=$APP/releases
TOOLS=$APP/tools
ENV_FILE=/etc/portfolio/portfolio.env
KEEP=3
HEALTH_URL="http://127.0.0.1:3000/"
HEALTH_TIMEOUT=120

log() { echo "[deploy] $*"; }
fail() { echo "[deploy] 실패: $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fail "root 권한이 필요합니다(sudo)."

exec 9>/run/portfolio-deploy.lock
flock -n 9 || fail "다른 배포가 진행 중입니다."

# 환경 변수 파일에서 값 하나를 읽는다(앞뒤 따옴표 제거).
read_env() {
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

[[ -r $ENV_FILE ]] || fail "$ENV_FILE 이 없습니다."
DATABASE_URL=$(read_env DATABASE_URL)
[[ $DATABASE_URL == file:/* ]] || fail "DATABASE_URL 은 file:/절대경로 형식이어야 합니다."
DB_PATH=${DATABASE_URL#file:}

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

log "배포 묶음 받는 중"
cat > "$work/release.tar.gz"
[[ -s $work/release.tar.gz ]] || fail "받은 파일이 비어 있습니다."
log "받은 크기: $(du -h "$work/release.tar.gz" | cut -f1)"

id=$(date +%Y%m%d-%H%M%S)
release=$RELEASES/$id
mkdir "$release"
if ! tar -xzf "$work/release.tar.gz" -C "$release" --no-same-owner \
  || [[ ! -f $release/server.js || ! -f $release/migrate/package.json ]]; then
  rm -rf "$release"
  fail "배포 묶음 형식이 올바르지 않습니다."
fi
log "새 버전: $id ($(cat "$release/REVISION" 2>/dev/null || echo '커밋 정보 없음'))"

# prisma CLI 는 앱 결과물에 들어 있지 않아서 버전별로 한 번만 설치해 두고 같이 쓴다.
key=$(sha256sum "$release/migrate/package.json" | cut -c1-16)
tools=$TOOLS/$key
if [[ ! -d $tools/node_modules ]]; then
  log "마이그레이션 도구(prisma) 설치 중. 처음 한 번은 1~2분 걸립니다."
  rm -rf "$tools.tmp"
  mkdir -p "$tools.tmp"
  cp "$release/migrate/package.json" "$tools.tmp/"
  if ! (cd "$tools.tmp" && npm install --omit=dev --no-audit --no-fund --loglevel=error); then
    rm -rf "$tools.tmp" "$release"
    fail "prisma 설치에 실패했습니다."
  fi
  mv "$tools.tmp" "$tools"
fi
ln -s "$tools/node_modules" "$release/migrate/node_modules"
chown -R portfolio:portfolio "$release"

# 마이그레이션 전에 DB 를 백업한다. 되돌릴 때는 README 의 복구 방법을 따른다.
if [[ -f $DB_PATH ]]; then
  log "배포 전 DB 백업"
  /usr/local/sbin/portfolio-backup pre-deploy
fi

log "DB 마이그레이션"
if ! (cd "$release/migrate" && runuser -u portfolio -- env -i \
  PATH=/usr/bin:/bin HOME=/var/lib/portfolio DATABASE_URL="$DATABASE_URL" \
  CHECKPOINT_DISABLE=1 PRISMA_HIDE_UPDATE_MESSAGE=1 \
  sh -c 'umask 077 && exec ./node_modules/.bin/prisma migrate deploy'); then
  rm -rf "$release"
  fail "마이그레이션에 실패했습니다. 실행 중인 버전은 그대로입니다."
fi

previous=$(readlink -f "$APP/current" 2>/dev/null || true)

switch_to() {
  ln -sfn "$1" "$APP/current.new"
  mv -Tf "$APP/current.new" "$APP/current"
}

healthy() {
  local waited=0
  while (( waited < HEALTH_TIMEOUT )); do
    if systemctl is-active --quiet portfolio \
      && curl -fsS -o /dev/null --max-time 10 "$HEALTH_URL"; then
      return 0
    fi
    sleep 3
    waited=$((waited + 3))
  done
  return 1
}

switch_to "$release"
log "앱 재시작"
systemctl restart portfolio

if healthy; then
  log "헬스체크 통과"
else
  echo "[deploy] 새 버전이 ${HEALTH_TIMEOUT}초 안에 응답하지 않았습니다. 최근 로그:" >&2
  journalctl -u portfolio -n 40 --no-pager >&2 || true
  if [[ -n $previous && -d $previous && $previous != "$release" ]]; then
    log "이전 버전으로 되돌리는 중: $(basename "$previous")"
    switch_to "$previous"
    systemctl restart portfolio
    if healthy; then
      log "이전 버전으로 복구했습니다."
    else
      echo "[deploy] 이전 버전도 응답하지 않습니다. 서버에서 journalctl -u portfolio 를 확인하세요." >&2
    fi
  fi
  rm -rf "$release"
  exit 1
fi

# 최근 버전 KEEP 개만 남긴다(지금 실행 중인 버전은 항상 남긴다).
current=$(readlink -f "$APP/current")
find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r | tail -n +$((KEEP + 1)) \
  | while read -r name; do
      [[ $RELEASES/$name == "$current" ]] || rm -rf "${RELEASES:?}/$name"
    done

log "배포 완료: $id"
