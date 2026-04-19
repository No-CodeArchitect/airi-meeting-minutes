#!/usr/bin/env bash
# Noto Sans KR TTF 폰트 다운로드 스크립트
# 최초 세팅 또는 Vercel 빌드 시 실행

set -e

FONTS_DIR="$(dirname "$0")/../public/fonts"
mkdir -p "$FONTS_DIR"

BASE="https://github.com/google/fonts/raw/main/ofl/notosanskr/static"

echo "⬇️  Noto Sans KR Regular 다운로드..."
curl -sL "${BASE}/NotoSansKR-Regular.ttf" -o "${FONTS_DIR}/NotoSansKR-Regular.ttf"

echo "⬇️  Noto Sans KR Bold 다운로드..."
curl -sL "${BASE}/NotoSansKR-Bold.ttf" -o "${FONTS_DIR}/NotoSansKR-Bold.ttf"

echo "✅ 폰트 다운로드 완료!"
ls -lh "$FONTS_DIR"
