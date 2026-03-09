#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"

BACKUP_DIR="${1:-/opt/ming-bir-hazina/backups}"
DATA_DIR="${2:-/var/lib/docker/volumes/ming_bir_hazina_data/_data}"
KEEP_DAYS="${3:-30}"
STAMP="$(date +%Y%m%d-%H%M%S)"
SQLITE_FILE="$DATA_DIR/accounting-state.sqlite"
JSON_FILE="$DATA_DIR/accounting-state.json"

if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$PROJECT_ROOT/.env"
  set +a
fi

notify_telegram() {
  local message="${1:-}"

  if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${BACKUP_TELEGRAM_CHAT_ID:-}" ] || [ -z "$message" ]; then
    return 0
  fi

  curl -fsS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H 'content-type: application/json' \
    -d "{\"chat_id\":\"${BACKUP_TELEGRAM_CHAT_ID}\",\"text\":\"${message}\"}" >/dev/null 2>&1 || true
}

fail() {
  local message="${1:-Backup xatosi.}"
  echo "$message"
  notify_telegram "Ming Bir Hazina backup xatosi\n${message}"
  exit 1
}

mkdir -p "$BACKUP_DIR"

if [ ! -f "$SQLITE_FILE" ]; then
  fail "SQLite file topilmadi: $SQLITE_FILE"
fi

if ! [[ "$KEEP_DAYS" =~ ^[0-9]+$ ]]; then
  fail "KEEP_DAYS butun son bo'lishi kerak."
fi

if ! sqlite3 "$SQLITE_FILE" ".backup '$BACKUP_DIR/accounting-state-$STAMP.sqlite'"; then
  fail "SQLite backup olishda xato bo'ldi."
fi

if [ -f "$JSON_FILE" ]; then
  cp "$JSON_FILE" "$BACKUP_DIR/accounting-state-$STAMP.json" || fail "JSON backup nusxalashda xato bo'ldi."
fi

find "$BACKUP_DIR" -type f -name 'accounting-state-*.sqlite' -mtime +"$KEEP_DAYS" -delete || fail "Eski sqlite backupni tozalashda xato bo'ldi."
find "$BACKUP_DIR" -type f -name 'accounting-state-*.json' -mtime +"$KEEP_DAYS" -delete || fail "Eski json backupni tozalashda xato bo'ldi."

notify_telegram "Ming Bir Hazina backup tayyor\nSana: ${STAMP}\nBackup papka: ${BACKUP_DIR}\nSaqlash muddati: ${KEEP_DAYS} kun"

find "$BACKUP_DIR" -type f | sort
