#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/opt/ming-bir-hazina}"
COMPOSE_FILE="$APP_DIR/deploy/vps/docker-compose.yml"
ENV_FILE="$APP_DIR/.env"
NGINX_SOURCE="$APP_DIR/deploy/vps/nginx-ming-bir-hazina.conf"
NGINX_TARGET="/etc/nginx/sites-available/ming-bir-hazina"

if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env file topilmadi: $ENV_FILE" >&2
  exit 1
fi

cd "$APP_DIR"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --force-recreate

cp "$NGINX_SOURCE" "$NGINX_TARGET"
ln -sf "$NGINX_TARGET" /etc/nginx/sites-enabled/ming-bir-hazina
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
curl -fsS http://127.0.0.1:3001/api/health
