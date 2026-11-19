#!/usr/bin/env bash
# DB(SQLite 온라인 백업)와 업로드 파일을 /var/backups/portfolio 에 남긴다. 14일이 지난 백업은 지운다.
#
# 설치 위치: /usr/local/sbin/portfolio-backup (server-setup.sh 가 복사)
# 실행: 매일 04:30 portfolio-backup.timer, 배포 직전에는 portfolio-deploy 가 "pre-deploy" 로 실행
#   수동: sudo portfolio-backup [이름표]
#
# 앱을 멈추지 않고 백업한다. sqlite3 의 .backup 은 쓰는 중인 DB 도 일관된 상태로 복사한다.
set -euo pipefail
umask 077

ENV_FILE=/etc/portfolio/portfolio.env
DEST=/var/backups/portfolio
KEEP_DAYS=14
label=${1:-daily}
[[ $label =~ ^[a-z0-9-]+$ ]] || { echo "이름표는 영문 소문자, 숫자, 하이픈만 씁니다." >&2; exit 1; }

read_env() {
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

db=$(read_env DATABASE_URL)
db=${db#file:}
uploads=$(read_env UPLOAD_DIR)
ts=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST"

# 백업 폴더는 root 만 읽을 수 있어서, 결과 요약을 앱이 읽을 수 있는 데이터 폴더에 따로 남긴다.
# 관리자 '서버·배포' 화면이 이 파일을 보여 준다. 예: /var/lib/portfolio/backup-status.json
status_file=""
[[ -n $uploads && -d $(dirname "$uploads") ]] && status_file="$(dirname "$uploads")/backup-status.json"
created=()
write_status() {
  [[ -n $status_file ]] || return 0
  local bytes=0 file
  for file in "${created[@]}"; do
    [[ -f $file ]] && bytes=$((bytes + $(stat -c %s "$file")))
  done
  local total count
  total=$(du -sb "$DEST" | cut -f1)
  count=$(find "$DEST" -maxdepth 1 -type f | wc -l)
  printf '{"ok":%s,"finishedAt":"%s","label":"%s","bytes":%d,"totalBytes":%d,"fileCount":%d}\n' \
    "$1" "$(date -Iseconds)" "$label" "$bytes" "$total" "$count" > "$status_file.tmp"
  chown root:portfolio "$status_file.tmp"
  chmod 0640 "$status_file.tmp"
  mv -f "$status_file.tmp" "$status_file"
}
# 중간에 실패하면 실패했다는 기록을 남긴다.
trap 'write_status false || true' ERR

if [[ -f $db ]]; then
  # DB 는 앱 사용자(portfolio)로 읽는다. root 로 열면 SQLite 보조 파일이 root 소유로 생겨 앱이 DB 를 못 열 수 있다.
  tmp=$(runuser -u portfolio -- mktemp -d)
  runuser -u portfolio -- sqlite3 "$db" ".backup '$tmp/db.sqlite3'"
  out="$DEST/db-$ts-$label.sqlite3"
  mv "$tmp/db.sqlite3" "$out"
  rm -rf "$tmp"
  chown root:root "$out"
  if [[ $(sqlite3 "$out" "PRAGMA integrity_check;") != "ok" ]]; then
    echo "[backup] 백업한 DB 의 무결성 검사에 실패했습니다: $out" >&2
    write_status false || true
    exit 1
  fi
  gzip -f "$out"
  created+=("$out.gz")
  echo "[backup] DB: $out.gz"
else
  echo "[backup] DB 파일이 아직 없어 건너뜁니다: $db"
fi

if [[ -d $uploads ]]; then
  tar -czf "$DEST/uploads-$ts-$label.tar.gz" -C "$(dirname "$uploads")" "$(basename "$uploads")"
  created+=("$DEST/uploads-$ts-$label.tar.gz")
  echo "[backup] 업로드 파일: $DEST/uploads-$ts-$label.tar.gz"
fi

find "$DEST" -maxdepth 1 -type f -mtime +"$KEEP_DAYS" -delete
write_status true
