#!/usr/bin/env bash
# 빌드 결과를 서버에 올릴 배포 묶음(portfolio-release.tar.gz)으로 만든다. GitHub Actions 에서 npm run build 직후 실행한다.
#
# 묶음 구성
#   server.js, node_modules, .next   ← .next/standalone
#   public, .next/static             ← standalone 에 들어 있지 않아 따로 넣는다
#   migrate/                         ← prisma 스키마·마이그레이션과 prisma CLI 버전(package.json)
#   REVISION                         ← 커밋 해시
#
# sharp, better-sqlite3 같은 네이티브 모듈은 빌드한 OS 용으로 들어가므로 서버와 같은 linux-x64 에서 빌드한다.
set -euo pipefail

out=${1:-portfolio-release.tar.gz}
[[ -f .next/standalone/server.js ]] || { echo "빌드 결과가 없습니다. 먼저 npm run build 를 실행하세요." >&2; exit 1; }

dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT

cp -a .next/standalone/. "$dir/"
# 빌드할 때 딸려 들어올 수 있는 로컬 파일은 넣지 않는다.
rm -rf "$dir/.env" "$dir"/.env.* "$dir/data"
rm -rf "$dir/public"
cp -a public "$dir/public"
rm -rf "$dir/.next/static"
cp -a .next/static "$dir/.next/static"

mkdir -p "$dir/migrate/prisma"
cp -a prisma/schema.prisma prisma/migrations "$dir/migrate/prisma/"
cp prisma.config.ts "$dir/migrate/"
# 서버에서 마이그레이션에 쓸 prisma CLI 버전을 package-lock.json 과 똑같이 맞춘다.
node -e '
  const lock = require("./package-lock.json");
  const version = (name) => lock.packages["node_modules/" + name].version;
  const pkg = { private: true, dependencies: { prisma: version("prisma"), dotenv: version("dotenv") } };
  require("fs").writeFileSync(process.argv[1], JSON.stringify(pkg, null, 2) + "\n");
' "$dir/migrate/package.json"

git rev-parse HEAD > "$dir/REVISION" 2>/dev/null || echo "unknown" > "$dir/REVISION"

tar -czf "$out" -C "$dir" .
echo "배포 묶음: $out ($(du -h "$out" | cut -f1))"
