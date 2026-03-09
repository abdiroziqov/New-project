# VPS Deploy

Bu loyiha `Nuxt + server API + SQLite` bo'lgani uchun `bitta VPS`ga birga deploy qilinadi.

## 1. VPS tayyorlash

Ubuntu 22.04 yoki 24.04 tavsiya qilinadi.

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg nginx
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

## 2. Loyihani serverga chiqarish

```bash
sudo mkdir -p /opt/ming-bir-hazina
sudo chown $USER:$USER /opt/ming-bir-hazina
cd /opt/ming-bir-hazina
```

Project fayllarini shu papkaga ko'chiring.

`.env` yarating:

```bash
cat > .env <<'EOF'
TELEGRAM_BOT_TOKEN=your_bot_token
REMINDER_TIMEZONE=Asia/Tashkent
BACKUP_TELEGRAM_CHAT_ID=your_chat_id
EOF
```

## 3. App ishga tushirish

```bash
cd /opt/ming-bir-hazina
docker compose -f deploy/vps/docker-compose.yml up -d --build
docker compose -f deploy/vps/docker-compose.yml ps
curl http://127.0.0.1:3000/api/health
```

## 4. Nginx ulash

```bash
sudo cp deploy/vps/nginx-ming-bir-hazina.conf /etc/nginx/sites-available/ming-bir-hazina
sudo ln -sf /etc/nginx/sites-available/ming-bir-hazina /etc/nginx/sites-enabled/ming-bir-hazina
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

`server_name _;` o'rniga domain bo'lsa domain yozing.

## 5. HTTPS

Domain bo'lsa:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

## 6. Backup

SQLite backup:

```bash
chmod +x deploy/vps/backup-sqlite.sh deploy/vps/restore-sqlite.sh
./deploy/vps/backup-sqlite.sh /opt/ming-bir-hazina/backups /var/lib/docker/volumes/ming_bir_hazina_data/_data 30
```

Cron misol:

```bash
crontab -e
```

```cron
0 3 * * * /opt/ming-bir-hazina/deploy/vps/backup-sqlite.sh /opt/ming-bir-hazina/backups /var/lib/docker/volumes/ming_bir_hazina_data/_data 30 >> /opt/ming-bir-hazina/backups/backup.log 2>&1
```

Bu misolda:

- har kuni `03:00` da backup olinadi
- backup `30 kun` saqlanadi
- undan eski backup fayllar avtomatik o'chadi
- `.env` ichida `BACKUP_TELEGRAM_CHAT_ID` bo'lsa, backup natijasi Telegramga yuboriladi

Restore:

```bash
cd /opt/ming-bir-hazina
docker compose -f deploy/vps/docker-compose.yml stop
./deploy/vps/restore-sqlite.sh /opt/ming-bir-hazina/backups/accounting-state-YYYYMMDD-HHMMSS.sqlite /var/lib/docker/volumes/ming_bir_hazina_data/_data /opt/ming-bir-hazina/backups/accounting-state-YYYYMMDD-HHMMSS.json
docker compose -f deploy/vps/docker-compose.yml start
```

## 7. Update

```bash
cd /opt/ming-bir-hazina
git pull
docker compose -f deploy/vps/docker-compose.yml up -d --build
```

## 8. Auto Deploy

GitHub Actions endi `main` branchga `push` bo'lganda VPS'ga o'zi deploy qiladi.

Kerakli GitHub repository secrets:

- `HOST` - VPS IP
- `USERNAME` - odatda `root`
- `PORT` - odatda `22`
- `SSH_KEY` - VPS ga kira oladigan private key

Workflow:

- project fayllarini `/opt/ming-bir-hazina` ga `rsync` qiladi
- `deploy/vps/deploy.sh` ni ishga tushiradi
- Docker app'ni qayta build qiladi
- nginx'ni reload qiladi

Muhim:

- VPS ichida `.env` oldindan yaratilgan bo'lishi kerak
- auto deploy `password` bilan emas, `SSH key` bilan ishlaydi

## Muhim

- Data Docker volume ichida saqlanadi
- Asosiy DB: `/data/accounting-state.sqlite`
- Server o'chib-yonib tursa ham data qoladi
- Yangi serverga ko'chirish uchun Docker volume ichidagi SQLite faylni olib o'tasiz
- Backup va restore qilishdan oldin backup yo'li va Docker volume nomini tekshirib oling
