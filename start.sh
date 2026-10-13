#!/usr/bin/env sh
# Локальная копия сайта синагоги: встроенный PostgreSQL + API + сайт. Остановить — Ctrl+C.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Нужен Node.js 20.19+ — скачайте LTS с https://nodejs.org"
  exit 1
fi
exec node scripts/dev-start.mjs "$@"
