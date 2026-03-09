#!/usr/bin/env bash
set -euo pipefail

BACKUP_SQLITE_FILE="${1:-}"
DATA_DIR="${2:-/var/lib/docker/volumes/ming_bir_hazina_data/_data}"
BACKUP_JSON_FILE="${3:-}"

if [ -z "$BACKUP_SQLITE_FILE" ]; then
  echo "Foydalanish: ./deploy/vps/restore-sqlite.sh /path/to/accounting-state-YYYYMMDD-HHMMSS.sqlite [DATA_DIR] [JSON_FILE]"
  exit 1
fi

if [ ! -f "$BACKUP_SQLITE_FILE" ]; then
  echo "Backup sqlite fayl topilmadi: $BACKUP_SQLITE_FILE"
  exit 1
fi

mkdir -p "$DATA_DIR"
cp "$BACKUP_SQLITE_FILE" "$DATA_DIR/accounting-state.sqlite"

if [ -n "$BACKUP_JSON_FILE" ]; then
  if [ ! -f "$BACKUP_JSON_FILE" ]; then
    echo "Backup json fayl topilmadi: $BACKUP_JSON_FILE"
    exit 1
  fi

  cp "$BACKUP_JSON_FILE" "$DATA_DIR/accounting-state.json"
fi

echo "Restore tugadi: $DATA_DIR/accounting-state.sqlite"
