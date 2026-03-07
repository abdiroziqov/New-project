#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-/opt/ming-bir-hazina/backups}"
DATA_DIR="${2:-/var/lib/docker/volumes/ming_bir_hazina_data/_data}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DATA_DIR/accounting-state.sqlite" ]; then
  echo "SQLite file topilmadi: $DATA_DIR/accounting-state.sqlite"
  exit 1
fi

sqlite3 "$DATA_DIR/accounting-state.sqlite" ".backup '$BACKUP_DIR/accounting-state-$STAMP.sqlite'"

if [ -f "$DATA_DIR/accounting-state.json" ]; then
  cp "$DATA_DIR/accounting-state.json" "$BACKUP_DIR/accounting-state-$STAMP.json"
fi

find "$BACKUP_DIR" -type f | sort
